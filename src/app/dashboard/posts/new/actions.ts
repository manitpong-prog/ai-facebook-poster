"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { getSessionResult } from "@/lib/session";
import {
  ensureDefaultWorkspace,
  ensureDefaultWritingProfile,
} from "@/lib/workspace";

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeTopic(topic: string) {
  return topic.replace(/\s+/g, " ").trim();
}

export async function createDraftPostAction(formData: FormData) {
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    redirect("/dashboard/posts/new?error=session_failed");
  }

  if (!sessionResult.session) {
    redirect("/login");
  }

  const topic = normalizeTopic(getTextValue(formData, "topic"));
  const styleOverride = getTextValue(formData, "styleOverride");

  if (topic.length < 3) {
    redirect("/dashboard/posts/new?error=topic_required");
  }

  let createdPostId = "";

  try {
    const currentMembership = await ensureDefaultWorkspace(sessionResult.session.user);
    const defaultWritingProfile = await ensureDefaultWritingProfile(
      currentMembership.workspaceId,
    );

    const [createdPost] = await db
      .insert(posts)
      .values({
        workspaceId: currentMembership.workspaceId,
        writingProfileId: defaultWritingProfile.id,
        topic,
        styleOverride,
        status: "draft",
        publishMode: "draft",
        createdByUserId: sessionResult.session.user.id,
        updatedAt: new Date(),
      })
      .returning({
        id: posts.id,
      });

    if (!createdPost) {
      throw new Error("Draft insert returned no post id");
    }

    createdPostId = createdPost.id;
  } catch (error) {
    console.error("Failed to create draft post:", error);
    redirect("/dashboard/posts/new?error=create_failed");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/posts");
  redirect(`/dashboard/posts/${createdPostId}?created=1`);
}
