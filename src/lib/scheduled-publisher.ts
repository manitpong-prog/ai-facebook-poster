import { and, asc, eq, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { facebookPages, posts } from "@/db/schema";
import { buildFacebookPostUrl, publishTextToFacebookPage } from "@/lib/facebook";

const DEFAULT_LIMIT_PER_RUN = 5;

export type PublishScheduledPostsOptions = {
  limit?: number;
  now?: Date;
};

export type ScheduledPublishItemResult = {
  postId: string;
  topic: string;
  status: "published" | "failed" | "skipped";
  scheduledAt: string | null;
  facebookPostId?: string;
  facebookPostUrl?: string;
  errorMessage?: string;
};

export type PublishScheduledPostsResult = {
  ok: boolean;
  now: string;
  limit: number;
  dueCount: number;
  publishedCount: number;
  failedCount: number;
  skippedCount: number;
  results: ScheduledPublishItemResult[];
};

function normalizeLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_LIMIT_PER_RUN;
  }

  return Math.min(Math.max(Math.floor(value), 1), 20);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

async function markScheduledPostAsError({
  postId,
  errorMessage,
}: {
  postId: string;
  errorMessage: string;
}) {
  await db
    .update(posts)
    .set({
      status: "error",
      errorMessage,
      retryCount: sql`${posts.retryCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));
}

export async function publishDueScheduledPosts({
  limit: rawLimit,
  now = new Date(),
}: PublishScheduledPostsOptions = {}): Promise<PublishScheduledPostsResult> {
  const limit = normalizeLimit(rawLimit);

  const duePosts = await db
    .select({
      id: posts.id,
      topic: posts.topic,
      generatedText: posts.generatedText,
      scheduledAt: posts.scheduledAt,
      pageId: facebookPages.pageId,
      pageAccessToken: facebookPages.accessTokenEncrypted,
    })
    .from(posts)
    .leftJoin(facebookPages, eq(posts.facebookPageId, facebookPages.id))
    .where(
      and(
        eq(posts.status, "scheduled"),
        lte(posts.scheduledAt, now),
        isNull(posts.facebookPostId),
      ),
    )
    .orderBy(asc(posts.scheduledAt))
    .limit(limit);

  const results: ScheduledPublishItemResult[] = [];

  for (const scheduledPost of duePosts) {
    const scheduledAt = scheduledPost.scheduledAt?.toISOString() ?? null;

    const [claimedPost] = await db
      .update(posts)
      .set({
        status: "posting",
        postingStartedAt: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(posts.id, scheduledPost.id),
          eq(posts.status, "scheduled"),
          lte(posts.scheduledAt, now),
          isNull(posts.facebookPostId),
        ),
      )
      .returning({ id: posts.id });

    if (!claimedPost) {
      results.push({
        postId: scheduledPost.id,
        topic: scheduledPost.topic,
        status: "skipped",
        scheduledAt,
        errorMessage: "Post was already claimed by another publish run.",
      });
      continue;
    }

    const message = scheduledPost.generatedText?.trim() ?? "";

    if (message.length < 3) {
      const errorMessage = "Scheduled post has no generated Preview text.";
      await markScheduledPostAsError({ postId: scheduledPost.id, errorMessage });
      results.push({
        postId: scheduledPost.id,
        topic: scheduledPost.topic,
        status: "failed",
        scheduledAt,
        errorMessage,
      });
      continue;
    }

    if (!scheduledPost.pageId || !scheduledPost.pageAccessToken) {
      const errorMessage = "Scheduled post has no connected Facebook Page token.";
      await markScheduledPostAsError({ postId: scheduledPost.id, errorMessage });
      results.push({
        postId: scheduledPost.id,
        topic: scheduledPost.topic,
        status: "failed",
        scheduledAt,
        errorMessage,
      });
      continue;
    }

    try {
      const facebookResult = await publishTextToFacebookPage({
        pageId: scheduledPost.pageId,
        pageAccessToken: scheduledPost.pageAccessToken,
        message,
      });

      const facebookPostUrl =
        facebookResult.permalinkUrl || buildFacebookPostUrl(facebookResult.id);

      await db
        .update(posts)
        .set({
          facebookPostId: facebookResult.id,
          facebookPostUrl,
          status: "posted",
          publishMode: "schedule",
          postedAt: new Date(),
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, scheduledPost.id));

      results.push({
        postId: scheduledPost.id,
        topic: scheduledPost.topic,
        status: "published",
        scheduledAt,
        facebookPostId: facebookResult.id,
        facebookPostUrl,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error("Failed to publish scheduled post:", {
        postId: scheduledPost.id,
        error,
      });

      await markScheduledPostAsError({ postId: scheduledPost.id, errorMessage });

      results.push({
        postId: scheduledPost.id,
        topic: scheduledPost.topic,
        status: "failed",
        scheduledAt,
        errorMessage,
      });
    }
  }

  const publishedCount = results.filter(
    (result) => result.status === "published",
  ).length;
  const failedCount = results.filter((result) => result.status === "failed").length;
  const skippedCount = results.filter(
    (result) => result.status === "skipped",
  ).length;

  return {
    ok: failedCount === 0,
    now: now.toISOString(),
    limit,
    dueCount: duePosts.length,
    publishedCount,
    failedCount,
    skippedCount,
    results,
  };
}
