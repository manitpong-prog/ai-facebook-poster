"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { testGeminiConnection } from "@/lib/ai/gemini";
import {
  deleteWorkspaceGeminiApiKey,
  getGeminiSettingsSummary,
  saveWorkspaceGeminiSettings,
} from "@/lib/ai/settings";
import { getSessionResult } from "@/lib/session";
import { ensureDefaultWorkspace } from "@/lib/workspace";

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeApiKey(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function normalizeModel(value: string) {
  return value.trim().slice(0, 120);
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

function truncateForUrl(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 420);
}

function buildRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/settings/ai?${searchParams.toString()}`;
}

function revalidateGeminiPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/autopilot");
  revalidatePath("/dashboard/deploy");
  revalidatePath("/dashboard/settings/ai");
}

async function getAuthorizedContext() {
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    redirect("/dashboard/settings/ai?error=session_failed");
  }

  if (!sessionResult.session) {
    redirect("/login");
  }

  const currentMembership = await ensureDefaultWorkspace(
    sessionResult.session.user,
  );

  if (
    currentMembership.role !== "owner" &&
    currentMembership.role !== "admin"
  ) {
    redirect("/dashboard/settings/ai?error=forbidden");
  }

  return {
    session: sessionResult.session,
    currentMembership,
  };
}

export async function saveGeminiSettingsAction(formData: FormData) {
  const { session, currentMembership } = await getAuthorizedContext();
  const apiKey = normalizeApiKey(getTextValue(formData, "apiKey"));
  const model = normalizeModel(getTextValue(formData, "model"));

  if (apiKey && apiKey.length < 20) {
    redirect("/dashboard/settings/ai?error=invalid_key");
  }

  let summary: Awaited<ReturnType<typeof getGeminiSettingsSummary>>;

  try {
    summary = await getGeminiSettingsSummary(currentMembership.workspaceId);
  } catch (error) {
    console.error("Failed to load Gemini settings before save:", error);
    redirect(
      buildRedirect({
        error: "save_failed",
        message: truncateForUrl(getErrorMessage(error)),
      }),
    );
  }

  if (!apiKey && !summary.hasWorkspaceKey && !summary.hasEnvironmentFallback) {
    redirect("/dashboard/settings/ai?error=key_required");
  }

  try {
    await saveWorkspaceGeminiSettings({
      workspaceId: currentMembership.workspaceId,
      userId: session.user.id,
      apiKey: apiKey || null,
      model,
    });
  } catch (error) {
    console.error("Failed to save Gemini settings:", error);
    redirect(
      buildRedirect({
        error: "save_failed",
        message: truncateForUrl(getErrorMessage(error)),
      }),
    );
  }

  revalidateGeminiPages();
  redirect("/dashboard/settings/ai?saved=1");
}

export async function testAndSaveGeminiSettingsAction(formData: FormData) {
  const { session, currentMembership } = await getAuthorizedContext();
  const apiKey = normalizeApiKey(getTextValue(formData, "apiKey"));
  const model = normalizeModel(getTextValue(formData, "model"));

  if (apiKey && apiKey.length < 20) {
    redirect("/dashboard/settings/ai?error=invalid_key");
  }

  let summary: Awaited<ReturnType<typeof getGeminiSettingsSummary>>;

  try {
    summary = await getGeminiSettingsSummary(currentMembership.workspaceId);
  } catch (error) {
    console.error("Failed to load Gemini settings before test:", error);
    redirect(
      buildRedirect({
        error: "test_failed",
        message: truncateForUrl(getErrorMessage(error)),
      }),
    );
  }

  if (!apiKey && !summary.hasUsableApiKey) {
    redirect("/dashboard/settings/ai?error=key_required");
  }

  let result: Awaited<ReturnType<typeof testGeminiConnection>>;

  try {
    result = await testGeminiConnection({
      workspaceId: currentMembership.workspaceId,
      apiKey: apiKey || null,
      model: model || null,
    });

    await saveWorkspaceGeminiSettings({
      workspaceId: currentMembership.workspaceId,
      userId: session.user.id,
      apiKey: apiKey || null,
      model: result.model,
      testedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to test Gemini settings:", error);
    redirect(
      buildRedirect({
        error: "test_failed",
        message: truncateForUrl(getErrorMessage(error)),
      }),
    );
  }

  revalidateGeminiPages();
  redirect(
    buildRedirect({
      tested: "1",
      model: result.model,
      source: apiKey ? "new_key" : result.source,
    }),
  );
}

export async function testCurrentGeminiSettingsAction() {
  const { session, currentMembership } = await getAuthorizedContext();
  let result: Awaited<ReturnType<typeof testGeminiConnection>>;

  try {
    result = await testGeminiConnection({
      workspaceId: currentMembership.workspaceId,
    });

    await saveWorkspaceGeminiSettings({
      workspaceId: currentMembership.workspaceId,
      userId: session.user.id,
      apiKey: null,
      model: result.model,
      testedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to test active Gemini key:", error);
    redirect(
      buildRedirect({
        error: "test_failed",
        message: truncateForUrl(getErrorMessage(error)),
      }),
    );
  }

  revalidateGeminiPages();
  redirect(
    buildRedirect({
      tested: "1",
      model: result.model,
      source: result.source,
    }),
  );
}

export async function deleteWorkspaceGeminiKeyAction() {
  const { session, currentMembership } = await getAuthorizedContext();

  try {
    await deleteWorkspaceGeminiApiKey(
      currentMembership.workspaceId,
      session.user.id,
    );
  } catch (error) {
    console.error("Failed to delete workspace Gemini key:", error);
    redirect(
      buildRedirect({
        error: "delete_failed",
        message: truncateForUrl(getErrorMessage(error)),
      }),
    );
  }

  revalidateGeminiPages();
  redirect("/dashboard/settings/ai?deleted=1");
}
