"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { aiUsageLogs, posts, writingProfiles } from "@/db/schema";
import { generateFacebookPostWithGemini } from "@/lib/ai/gemini";
import { getSessionResult } from "@/lib/session";
import { ensureDefaultWorkspace } from "@/lib/workspace";

const DELETABLE_STATUSES = new Set(["draft", "generated", "error", "cancelled"]);

function getPostId(formData: FormData) {
  const value = formData.get("postId");

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildRedirectPath(postId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/posts/${postId}?${searchParams.toString()}`;
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
  return message.replace(/\s+/g, " ").trim().slice(0, 320);
}

async function getOwnedPost(postId: string) {
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    return {
      sessionError: true as const,
      session: null,
      currentMembership: null,
      post: null,
    };
  }

  if (!sessionResult.session) {
    return {
      sessionError: false as const,
      session: null,
      currentMembership: null,
      post: null,
    };
  }

  const currentMembership = await ensureDefaultWorkspace(sessionResult.session.user);

  const [post] = await db
    .select({
      id: posts.id,
      workspaceId: posts.workspaceId,
      topic: posts.topic,
      styleOverride: posts.styleOverride,
      writingProfileId: posts.writingProfileId,
      status: posts.status,
    })
    .from(posts)
    .where(
      and(
        eq(posts.id, postId),
        eq(posts.workspaceId, currentMembership.workspaceId),
      ),
    )
    .limit(1);

  return {
    sessionError: false as const,
    session: sessionResult.session,
    currentMembership,
    post: post ?? null,
  };
}

export async function generatePostWithGeminiAction(formData: FormData) {
  const postId = getPostId(formData);

  if (!postId) {
    redirect("/dashboard/posts?error=post_not_found");
  }

  const ownedPost = await getOwnedPost(postId);

  if (ownedPost.sessionError) {
    redirect(buildRedirectPath(postId, { generateError: "session_failed" }));
  }

  if (!ownedPost.session) {
    redirect("/login");
  }

  if (!ownedPost.currentMembership || !ownedPost.post) {
    redirect("/dashboard/posts?error=post_not_found");
  }

  const { currentMembership, post } = ownedPost;

  try {
    let writingProfile = null;

    if (post.writingProfileId) {
      [writingProfile] = await db
        .select()
        .from(writingProfiles)
        .where(
          and(
            eq(writingProfiles.id, post.writingProfileId),
            eq(writingProfiles.workspaceId, currentMembership.workspaceId),
          ),
        )
        .limit(1);
    }

    const generated = await generateFacebookPostWithGemini({
      topic: post.topic,
      styleOverride: post.styleOverride,
      writingProfile,
    });

    await db
      .update(posts)
      .set({
        generatedText: generated.content,
        status: "generated",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(posts.id, post.id),
          eq(posts.workspaceId, currentMembership.workspaceId),
        ),
      );

    await db.insert(aiUsageLogs).values({
      workspaceId: currentMembership.workspaceId,
      postId: post.id,
      model: generated.model,
      inputTokens: generated.inputTokens,
      outputTokens: generated.outputTokens,
      totalTokens: generated.totalTokens,
    });
  } catch (error) {
    const message = getActionErrorMessage(error);
    console.error("Failed to generate post with Gemini:", error);

    await db
      .update(posts)
      .set({
        status: "error",
        errorMessage: message,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(posts.id, post.id),
          eq(posts.workspaceId, currentMembership.workspaceId),
        ),
      );

    redirect(
      buildRedirectPath(postId, {
        generateError: "gemini_failed",
        message: truncateForUrl(message),
      }),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/posts");
  revalidatePath(`/dashboard/posts/${postId}`);
  redirect(buildRedirectPath(postId, { generated: "1" }));
}

export async function updateGeneratedTextAction(formData: FormData) {
  const postId = getPostId(formData);
  const generatedText = getTextValue(formData, "generatedText");

  if (!postId) {
    redirect("/dashboard/posts?error=post_not_found");
  }

  if (generatedText.length < 10) {
    redirect(buildRedirectPath(postId, { updateError: "content_required" }));
  }

  const ownedPost = await getOwnedPost(postId);

  if (ownedPost.sessionError) {
    redirect(buildRedirectPath(postId, { updateError: "session_failed" }));
  }

  if (!ownedPost.session) {
    redirect("/login");
  }

  if (!ownedPost.currentMembership || !ownedPost.post) {
    redirect("/dashboard/posts?error=post_not_found");
  }

  try {
    await db
      .update(posts)
      .set({
        generatedText,
        status: "generated",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(posts.id, ownedPost.post.id),
          eq(posts.workspaceId, ownedPost.currentMembership.workspaceId),
        ),
      );
  } catch (error) {
    console.error("Failed to update generated text:", error);
    redirect(buildRedirectPath(postId, { updateError: "save_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/posts");
  revalidatePath(`/dashboard/posts/${postId}`);
  redirect(buildRedirectPath(postId, { updated: "1" }));
}

export async function deleteDraftPostAction(formData: FormData) {
  const postId = getPostId(formData);

  if (!postId) {
    redirect("/dashboard/posts?error=post_not_found");
  }

  const ownedPost = await getOwnedPost(postId);

  if (ownedPost.sessionError) {
    redirect(buildRedirectPath(postId, { deleteError: "session_failed" }));
  }

  if (!ownedPost.session) {
    redirect("/login");
  }

  if (!ownedPost.currentMembership || !ownedPost.post) {
    redirect("/dashboard/posts?error=post_not_found");
  }

  if (!DELETABLE_STATUSES.has(ownedPost.post.status)) {
    redirect(buildRedirectPath(postId, { deleteError: "not_allowed" }));
  }

  try {
    await db
      .delete(posts)
      .where(
        and(
          eq(posts.id, ownedPost.post.id),
          eq(posts.workspaceId, ownedPost.currentMembership.workspaceId),
        ),
      );
  } catch (error) {
    console.error("Failed to delete draft post:", error);
    redirect(buildRedirectPath(postId, { deleteError: "delete_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/posts");
  redirect("/dashboard/posts?deleted=1");
}
