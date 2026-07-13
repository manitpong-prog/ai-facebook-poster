import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiUsageLogs, contentTopics, posts } from "@/db/schema";
import { generateFacebookPostWithGemini } from "@/lib/ai/gemini";
import { ensureDefaultWritingProfile } from "@/lib/workspace";

const DEFAULT_TOPIC_LIMIT = 1;

export const topicSelectionModes = ["ordered", "random"] as const;
export type TopicSelectionMode = (typeof topicSelectionModes)[number];

type AutoWriteNextTopicInput = {
  workspaceId: string;
  userId?: string | null;
  selectionMode?: TopicSelectionMode | string | null;
};

export type AutoWriteNextTopicResult =
  | {
      status: "no_active_topic";
    }
  | {
      status: "generated";
      topicId: string;
      topicTitle: string;
      postId: string;
      selectionMode: TopicSelectionMode;
    };

export function normalizeTopicSelectionMode(
  value: string | null | undefined,
): TopicSelectionMode {
  return value === "random" ? "random" : "ordered";
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

export async function autoWriteNextTopic({
  workspaceId,
  userId,
  selectionMode,
}: AutoWriteNextTopicInput): Promise<AutoWriteNextTopicResult> {
  const normalizedSelectionMode = normalizeTopicSelectionMode(selectionMode);

  const topicQuery = db
    .select({
      id: contentTopics.id,
      title: contentTopics.title,
      notes: contentTopics.notes,
      status: contentTopics.status,
    })
    .from(contentTopics)
    .where(
      and(
        eq(contentTopics.workspaceId, workspaceId),
        eq(contentTopics.status, "active"),
      ),
    )
    .$dynamic();

  const [nextTopic] = await (normalizedSelectionMode === "random"
    ? topicQuery.orderBy(sql`random()`).limit(DEFAULT_TOPIC_LIMIT)
    : topicQuery
        .orderBy(asc(contentTopics.priority), asc(contentTopics.createdAt))
        .limit(DEFAULT_TOPIC_LIMIT));

  if (!nextTopic) {
    return { status: "no_active_topic" };
  }

  const [claimedTopic] = await db
    .update(contentTopics)
    .set({
      status: "paused",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contentTopics.id, nextTopic.id),
        eq(contentTopics.workspaceId, workspaceId),
        eq(contentTopics.status, "active"),
      ),
    )
    .returning({
      id: contentTopics.id,
      title: contentTopics.title,
      notes: contentTopics.notes,
    });

  if (!claimedTopic) {
    return { status: "no_active_topic" };
  }

  let createdPostId = "";

  try {
    const defaultWritingProfile =
      await ensureDefaultWritingProfile(workspaceId);

    const [createdPost] = await db
      .insert(posts)
      .values({
        workspaceId,
        writingProfileId: defaultWritingProfile.id,
        topic: claimedTopic.title,
        styleOverride: claimedTopic.notes,
        status: "draft",
        publishMode: "draft",
        createdByUserId: userId ?? null,
        updatedAt: new Date(),
      })
      .returning({ id: posts.id });

    if (!createdPost) {
      throw new Error("Auto writer insert returned no post id");
    }

    createdPostId = createdPost.id;

    const generated = await generateFacebookPostWithGemini({
      workspaceId,
      topic: claimedTopic.title,
      styleOverride: claimedTopic.notes,
      writingProfile: defaultWritingProfile,
    });

    await db
      .update(posts)
      .set({
        generatedText: generated.content,
        status: "generated",
        publishMode: "draft",
        scheduledAt: null,
        facebookPageId: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(posts.id, createdPostId), eq(posts.workspaceId, workspaceId)),
      );

    await db.insert(aiUsageLogs).values({
      workspaceId,
      postId: createdPostId,
      model: generated.model,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      totalTokens: generated.totalTokens,
    });

    await db
      .update(contentTopics)
      .set({
        status: "used",
        usedAt: new Date(),
        createdPostId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentTopics.id, claimedTopic.id),
          eq(contentTopics.workspaceId, workspaceId),
        ),
      );

    return {
      status: "generated",
      topicId: claimedTopic.id,
      topicTitle: claimedTopic.title,
      postId: createdPostId,
      selectionMode: normalizedSelectionMode,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    await db
      .update(contentTopics)
      .set({
        status: "active",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentTopics.id, claimedTopic.id),
          eq(contentTopics.workspaceId, workspaceId),
          eq(contentTopics.status, "paused"),
        ),
      );

    if (createdPostId) {
      await db
        .update(posts)
        .set({
          status: "error",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(
          and(eq(posts.id, createdPostId), eq(posts.workspaceId, workspaceId)),
        );
    }

    throw error;
  }
}
