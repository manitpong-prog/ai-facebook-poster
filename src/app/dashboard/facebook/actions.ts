"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { facebookPages } from "@/db/schema";
import { publishTextToFacebookPage } from "@/lib/facebook";
import { getSessionResult } from "@/lib/session";
import { ensureDefaultWorkspace } from "@/lib/workspace";

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizePageId(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function normalizeAccessToken(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function truncateForUrl(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 320);
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

function buildFacebookRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/facebook?${searchParams.toString()}`;
}

async function getCurrentWorkspace() {
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    redirect("/dashboard/facebook?error=session_failed");
  }

  if (!sessionResult.session) {
    redirect("/login");
  }

  return ensureDefaultWorkspace(sessionResult.session.user);
}

async function getSavedFacebookPage(workspaceId: string) {
  const [facebookPage] = await db
    .select()
    .from(facebookPages)
    .where(eq(facebookPages.workspaceId, workspaceId))
    .limit(1);

  return facebookPage ?? null;
}

export async function saveFacebookPageAction(formData: FormData) {
  const currentMembership = await getCurrentWorkspace();

  const pageName = getTextValue(formData, "pageName");
  const pageId = normalizePageId(getTextValue(formData, "pageId"));
  const pageAccessToken = normalizeAccessToken(getTextValue(formData, "pageAccessToken"));

  if (!pageName || !pageId) {
    redirect("/dashboard/facebook?saveError=page_required");
  }

  let existingPage: Awaited<ReturnType<typeof getSavedFacebookPage>>;

  try {
    existingPage = await getSavedFacebookPage(currentMembership.workspaceId);
  } catch (error) {
    console.error("Failed to load saved Facebook Page settings:", error);
    redirect("/dashboard/facebook?saveError=save_failed");
  }

  const tokenToSave = pageAccessToken || existingPage?.accessTokenEncrypted || "";

  if (!tokenToSave) {
    redirect("/dashboard/facebook?saveError=token_required");
  }

  try {
    if (existingPage) {
      await db
        .update(facebookPages)
        .set({
          pageName,
          pageId,
          accessTokenEncrypted: tokenToSave,
          status: "connected",
          updatedAt: new Date(),
        })
        .where(eq(facebookPages.id, existingPage.id));
    } else {
      await db.insert(facebookPages).values({
        workspaceId: currentMembership.workspaceId,
        pageName,
        pageId,
        accessTokenEncrypted: tokenToSave,
        status: "connected",
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Failed to save Facebook Page settings:", error);
    redirect("/dashboard/facebook?saveError=save_failed");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/facebook");
  redirect("/dashboard/facebook?saved=1");
}

export async function testFacebookPagePostAction(formData: FormData) {
  const currentMembership = await getCurrentWorkspace();
  const message = getTextValue(formData, "message");

  if (message.length < 3) {
    redirect("/dashboard/facebook?testError=message_required");
  }

  const savedPage = await getSavedFacebookPage(currentMembership.workspaceId);

  if (!savedPage || !savedPage.pageId || !savedPage.accessTokenEncrypted) {
    redirect("/dashboard/facebook?testError=page_not_connected");
  }

  const pageId = savedPage.pageId;
  const pageAccessToken = savedPage.accessTokenEncrypted;
  let facebookPostId = "";

  try {
    const result = await publishTextToFacebookPage({
      pageId,
      pageAccessToken,
      message,
    });

    facebookPostId = result.id;

    await db
      .update(facebookPages)
      .set({
        status: "connected",
        lastTestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(facebookPages.id, savedPage.id));
  } catch (error) {
    const message = getActionErrorMessage(error);
    console.error("Failed to test Facebook Page post:", error);

    await db
      .update(facebookPages)
      .set({
        status: "error",
        lastTestedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(facebookPages.id, savedPage.id));

    revalidatePath("/dashboard/facebook");
    redirect(
      buildFacebookRedirect({
        testError: "facebook_failed",
        message: truncateForUrl(message),
      }),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/facebook");
  redirect(
    buildFacebookRedirect({
      tested: "1",
      facebookPostId,
    }),
  );
}
