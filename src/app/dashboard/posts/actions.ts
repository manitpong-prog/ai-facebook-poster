"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { getSessionResult } from "@/lib/session";
import { ensureDefaultWorkspace } from "@/lib/workspace";

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function buildPostsRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/posts?${searchParams.toString()}`;
}

async function getCurrentWorkspace() {
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    redirect(buildPostsRedirect({ error: "session_failed" }));
  }

  if (!sessionResult.session) {
    redirect("/login");
  }

  return ensureDefaultWorkspace(sessionResult.session.user);
}

export async function deletePostFromListAction(formData: FormData) {
  const postId = getTextValue(formData, "postId");

  if (!postId) {
    redirect(buildPostsRedirect({ error: "post_not_found" }));
  }

  const currentMembership = await getCurrentWorkspace();

  const [post] = await db
    .select({
      id: posts.id,
      workspaceId: posts.workspaceId,
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

  if (!post) {
    redirect(buildPostsRedirect({ error: "post_not_found" }));
  }

  if (post.status === "posting") {
    redirect(buildPostsRedirect({ error: "posting_delete_blocked" }));
  }

  try {
    await db
      .delete(posts)
      .where(
        and(
          eq(posts.id, post.id),
          eq(posts.workspaceId, currentMembership.workspaceId),
        ),
      );
  } catch (error) {
    console.error("Failed to delete post from list:", error);
    redirect(buildPostsRedirect({ error: "delete_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard/topics");
  redirect(buildPostsRedirect({ deleted: "1" }));
}
