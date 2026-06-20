"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { contentTopics, posts } from "@/db/schema";
import { getSessionResult } from "@/lib/session";
import { autoWriteNextTopic } from "@/lib/topic-auto-writer";
import {
  ensureDefaultWorkspace,
  ensureDefaultWritingProfile,
} from "@/lib/workspace";

type TopicStatus = "active" | "paused" | "used" | "archived";

const editableStatuses = new Set<TopicStatus>(["active", "paused", "archived"]);

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeTopicTitle(value: string) {
  return value
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTopicKey(value: string) {
  return normalizeTopicTitle(value).toLocaleLowerCase("th-TH");
}

function buildTopicsRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/topics?${searchParams.toString()}`;
}

async function getWorkspaceForAction() {
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    return {
      sessionError: true as const,
      session: null,
      currentMembership: null,
    };
  }

  if (!sessionResult.session) {
    return {
      sessionError: false as const,
      session: null,
      currentMembership: null,
    };
  }

  const currentMembership = await ensureDefaultWorkspace(
    sessionResult.session.user,
  );

  return {
    sessionError: false as const,
    session: sessionResult.session,
    currentMembership,
  };
}

async function getOwnedTopic(topicId: string) {
  const workspaceResult = await getWorkspaceForAction();

  if (workspaceResult.sessionError || !workspaceResult.session) {
    return {
      ...workspaceResult,
      topic: null,
    };
  }

  const [topic] = await db
    .select()
    .from(contentTopics)
    .where(
      and(
        eq(contentTopics.id, topicId),
        eq(
          contentTopics.workspaceId,
          workspaceResult.currentMembership.workspaceId,
        ),
      ),
    )
    .limit(1);

  return {
    ...workspaceResult,
    topic: topic ?? null,
  };
}

export async function createTopicsAction(formData: FormData) {
  const topicsText = getTextValue(formData, "topicsText");
  const notes = getTextValue(formData, "notes");

  const titles = Array.from(
    new Set(
      topicsText
        .split(/\r?\n/)
        .map(normalizeTopicTitle)
        .filter((topic) => topic.length >= 3),
    ),
  );

  if (titles.length === 0) {
    redirect(buildTopicsRedirect({ error: "topic_required" }));
  }

  const workspaceResult = await getWorkspaceForAction();

  if (workspaceResult.sessionError) {
    redirect(buildTopicsRedirect({ error: "session_failed" }));
  }

  if (!workspaceResult.session) {
    redirect("/login");
  }

  if (!workspaceResult.currentMembership) {
    redirect(buildTopicsRedirect({ error: "workspace_missing" }));
  }

  let createdCount = 0;
  let duplicateCount = 0;

  try {
    const existingTopics = await db
      .select({ title: contentTopics.title })
      .from(contentTopics)
      .where(
        eq(
          contentTopics.workspaceId,
          workspaceResult.currentMembership.workspaceId,
        ),
      );

    const existingTopicKeys = new Set(
      existingTopics.map((topic) => normalizeTopicKey(topic.title)),
    );

    const newTitles = titles.filter((title) => {
      const key = normalizeTopicKey(title);

      if (existingTopicKeys.has(key)) {
        duplicateCount += 1;
        return false;
      }

      existingTopicKeys.add(key);
      return true;
    });

    if (newTitles.length > 0) {
      await db.insert(contentTopics).values(
        newTitles.map((title) => ({
          workspaceId: workspaceResult.currentMembership.workspaceId,
          title,
          notes: notes || null,
          status: "active" as const,
          createdByUserId: workspaceResult.session.user.id,
          updatedAt: new Date(),
        })),
      );
    }

    createdCount = newTitles.length;
  } catch (error) {
    console.error("Failed to create content topics:", error);
    redirect(buildTopicsRedirect({ error: "create_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/topics");
  redirect(
    buildTopicsRedirect({
      created: String(createdCount),
      duplicates: String(duplicateCount),
    }),
  );
}

export async function deleteTopicAction(formData: FormData) {
  const topicId = getTextValue(formData, "topicId");

  if (!topicId) {
    redirect(buildTopicsRedirect({ error: "topic_not_found" }));
  }

  const ownedTopic = await getOwnedTopic(topicId);

  if (ownedTopic.sessionError) {
    redirect(buildTopicsRedirect({ error: "session_failed" }));
  }

  if (!ownedTopic.session) {
    redirect("/login");
  }

  if (!ownedTopic.currentMembership || !ownedTopic.topic) {
    redirect(buildTopicsRedirect({ error: "topic_not_found" }));
  }

  try {
    await db
      .delete(contentTopics)
      .where(
        and(
          eq(contentTopics.id, ownedTopic.topic.id),
          eq(
            contentTopics.workspaceId,
            ownedTopic.currentMembership.workspaceId,
          ),
        ),
      );
  } catch (error) {
    console.error("Failed to delete topic:", error);
    redirect(buildTopicsRedirect({ error: "delete_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/topics");
  redirect(buildTopicsRedirect({ deleted: "1" }));
}

export async function reuseTopicAction(formData: FormData) {
  const topicId = getTextValue(formData, "topicId");

  if (!topicId) {
    redirect(buildTopicsRedirect({ error: "topic_not_found" }));
  }

  const ownedTopic = await getOwnedTopic(topicId);

  if (ownedTopic.sessionError) {
    redirect(buildTopicsRedirect({ error: "session_failed" }));
  }

  if (!ownedTopic.session) {
    redirect("/login");
  }

  if (!ownedTopic.currentMembership || !ownedTopic.topic) {
    redirect(buildTopicsRedirect({ error: "topic_not_found" }));
  }

  if (ownedTopic.topic.status !== "used") {
    redirect(buildTopicsRedirect({ error: "reuse_only_used" }));
  }

  try {
    await db
      .update(contentTopics)
      .set({
        status: "active",
        usedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentTopics.id, ownedTopic.topic.id),
          eq(
            contentTopics.workspaceId,
            ownedTopic.currentMembership.workspaceId,
          ),
        ),
      );
  } catch (error) {
    console.error("Failed to reuse topic:", error);
    redirect(buildTopicsRedirect({ error: "reuse_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/topics");
  redirect(buildTopicsRedirect({ reused: "1" }));
}

export async function resetUsedTopicsAction() {
  const workspaceResult = await getWorkspaceForAction();

  if (workspaceResult.sessionError) {
    redirect(buildTopicsRedirect({ error: "session_failed" }));
  }

  if (!workspaceResult.session) {
    redirect("/login");
  }

  if (!workspaceResult.currentMembership) {
    redirect(buildTopicsRedirect({ error: "workspace_missing" }));
  }

  let resetCount = 0;

  try {
    const resetTopics = await db
      .update(contentTopics)
      .set({
        status: "active",
        usedAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(
            contentTopics.workspaceId,
            workspaceResult.currentMembership.workspaceId,
          ),
          eq(contentTopics.status, "used"),
        ),
      )
      .returning({ id: contentTopics.id });

    resetCount = resetTopics.length;
  } catch (error) {
    console.error("Failed to reset used topics:", error);
    redirect(buildTopicsRedirect({ error: "reset_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/topics");
  redirect(buildTopicsRedirect({ reset: String(resetCount) }));
}

export async function updateTopicStatusAction(formData: FormData) {
  const topicId = getTextValue(formData, "topicId");
  const nextStatus = getTextValue(formData, "status") as TopicStatus;

  if (!topicId || !editableStatuses.has(nextStatus)) {
    redirect(buildTopicsRedirect({ error: "invalid_status" }));
  }

  const ownedTopic = await getOwnedTopic(topicId);

  if (ownedTopic.sessionError) {
    redirect(buildTopicsRedirect({ error: "session_failed" }));
  }

  if (!ownedTopic.session) {
    redirect("/login");
  }

  if (!ownedTopic.currentMembership || !ownedTopic.topic) {
    redirect(buildTopicsRedirect({ error: "topic_not_found" }));
  }

  if (ownedTopic.topic.status === "used") {
    redirect(buildTopicsRedirect({ error: "topic_already_used" }));
  }

  try {
    await db
      .update(contentTopics)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contentTopics.id, ownedTopic.topic.id),
          eq(
            contentTopics.workspaceId,
            ownedTopic.currentMembership.workspaceId,
          ),
        ),
      );
  } catch (error) {
    console.error("Failed to update topic status:", error);
    redirect(buildTopicsRedirect({ error: "status_failed" }));
  }

  revalidatePath("/dashboard/topics");
  redirect(buildTopicsRedirect({ updated: "1" }));
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function truncateForUrl(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 280);
}

export async function autoWriteNextTopicAction() {
  const workspaceResult = await getWorkspaceForAction();

  if (workspaceResult.sessionError) {
    redirect(buildTopicsRedirect({ error: "session_failed" }));
  }

  if (!workspaceResult.session) {
    redirect("/login");
  }

  if (!workspaceResult.currentMembership) {
    redirect(buildTopicsRedirect({ error: "workspace_missing" }));
  }

  let result: Awaited<ReturnType<typeof autoWriteNextTopic>>;

  try {
    result = await autoWriteNextTopic({
      workspaceId: workspaceResult.currentMembership.workspaceId,
      userId: workspaceResult.session.user.id,
    });
  } catch (error) {
    const message = getActionErrorMessage(error);
    console.error("Failed to auto write next topic:", error);

    redirect(
      buildTopicsRedirect({
        error: "auto_write_failed",
        message: truncateForUrl(message),
      }),
    );
  }

  if (result.status === "no_active_topic") {
    redirect(buildTopicsRedirect({ error: "no_active_topic" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/topics");
  revalidatePath("/dashboard/posts");
  revalidatePath(`/dashboard/posts/${result.postId}`);
  redirect(`/dashboard/posts/${result.postId}?generated=1&fromTopic=1`);
}

export async function createDraftFromTopicAction(formData: FormData) {
  const topicId = getTextValue(formData, "topicId");

  if (!topicId) {
    redirect(buildTopicsRedirect({ error: "topic_not_found" }));
  }

  const ownedTopic = await getOwnedTopic(topicId);

  if (ownedTopic.sessionError) {
    redirect(buildTopicsRedirect({ error: "session_failed" }));
  }

  if (!ownedTopic.session) {
    redirect("/login");
  }

  if (!ownedTopic.currentMembership || !ownedTopic.topic) {
    redirect(buildTopicsRedirect({ error: "topic_not_found" }));
  }

  if (ownedTopic.topic.status === "used") {
    redirect(buildTopicsRedirect({ error: "topic_already_used" }));
  }

  if (ownedTopic.topic.status === "archived") {
    redirect(buildTopicsRedirect({ error: "topic_archived" }));
  }

  let createdPostId = "";

  try {
    const defaultWritingProfile = await ensureDefaultWritingProfile(
      ownedTopic.currentMembership.workspaceId,
    );

    const [createdPost] = await db
      .insert(posts)
      .values({
        workspaceId: ownedTopic.currentMembership.workspaceId,
        writingProfileId: defaultWritingProfile.id,
        topic: ownedTopic.topic.title,
        styleOverride: ownedTopic.topic.notes,
        status: "draft",
        publishMode: "draft",
        createdByUserId: ownedTopic.session.user.id,
        updatedAt: new Date(),
      })
      .returning({
        id: posts.id,
      });

    if (!createdPost) {
      throw new Error("Topic draft insert returned no post id");
    }

    createdPostId = createdPost.id;

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
          eq(contentTopics.id, ownedTopic.topic.id),
          eq(
            contentTopics.workspaceId,
            ownedTopic.currentMembership.workspaceId,
          ),
        ),
      );
  } catch (error) {
    console.error("Failed to create draft from topic:", error);
    redirect(buildTopicsRedirect({ error: "draft_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/topics");
  revalidatePath("/dashboard/posts");
  redirect(`/dashboard/posts/${createdPostId}?created=1`);
}
