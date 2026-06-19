"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { automationSettings } from "@/db/schema";
import {
  BANGKOK_TIMEZONE,
  getNextAutoPilotRunAt,
  normalizeAutoPilotSettingsInput,
  runAutoPilotForWorkspaceNow,
} from "@/lib/auto-pilot";
import { publishDueScheduledPosts } from "@/lib/scheduled-publisher";
import { getSessionResult } from "@/lib/session";
import { ensureDefaultWorkspace } from "@/lib/workspace";

function buildAutoPilotRedirect(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `/dashboard/autopilot?${searchParams.toString()}`;
}

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

export async function updateAutoPilotSettingsAction(formData: FormData) {
  const workspaceResult = await getWorkspaceForAction();

  if (workspaceResult.sessionError) {
    redirect(buildAutoPilotRedirect({ error: "session_failed" }));
  }

  if (!workspaceResult.session) {
    redirect("/login");
  }

  if (!workspaceResult.currentMembership) {
    redirect(buildAutoPilotRedirect({ error: "workspace_missing" }));
  }

  const normalizedInput = normalizeAutoPilotSettingsInput({
    isEnabled: formData.get("isEnabled") === "on",
    mode: getTextValue(formData, "mode"),
    frequencyDays: getTextValue(formData, "frequencyDays"),
    postTime: getTextValue(formData, "postTime"),
  });

  const now = new Date();
  const nextRunAt = normalizedInput.isEnabled
    ? getNextAutoPilotRunAt({
        frequencyDays: normalizedInput.frequencyDays,
        postTime: normalizedInput.postTime,
        from: now,
      })
    : null;

  try {
    await db
      .insert(automationSettings)
      .values({
        workspaceId: workspaceResult.currentMembership.workspaceId,
        isEnabled: normalizedInput.isEnabled,
        mode: normalizedInput.mode,
        frequencyDays: normalizedInput.frequencyDays,
        postTime: normalizedInput.postTime,
        timezone: BANGKOK_TIMEZONE,
        nextRunAt,
        lastErrorMessage: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: automationSettings.workspaceId,
        set: {
          isEnabled: normalizedInput.isEnabled,
          mode: normalizedInput.mode,
          frequencyDays: normalizedInput.frequencyDays,
          postTime: normalizedInput.postTime,
          timezone: BANGKOK_TIMEZONE,
          nextRunAt,
          lastErrorMessage: null,
          updatedAt: now,
        },
      });
  } catch (error) {
    console.error("Failed to update Auto Pilot settings:", error);
    redirect(buildAutoPilotRedirect({ error: "save_failed" }));
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/autopilot");
  redirect(buildAutoPilotRedirect({ saved: "1" }));
}

export async function runAutoPilotNowAction() {
  const workspaceResult = await getWorkspaceForAction();

  if (workspaceResult.sessionError) {
    redirect(buildAutoPilotRedirect({ error: "session_failed" }));
  }

  if (!workspaceResult.session) {
    redirect("/login");
  }

  if (!workspaceResult.currentMembership) {
    redirect(buildAutoPilotRedirect({ error: "workspace_missing" }));
  }

  const now = new Date();

  try {
    const autoPilotResult = await runAutoPilotForWorkspaceNow({
      workspaceId: workspaceResult.currentMembership.workspaceId,
      now,
    });

    const publishResult = await publishDueScheduledPosts({ limit: 5, now });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/autopilot");
    revalidatePath("/dashboard/topics");
    revalidatePath("/dashboard/posts");

    const params: Record<string, string> = {
      ran: "1",
      status: autoPilotResult.status,
      published: String(publishResult.publishedCount),
      failed: String(publishResult.failedCount),
    };

    if (autoPilotResult.postId) {
      params.postId = autoPilotResult.postId;
    }

    redirect(buildAutoPilotRedirect(params));
  } catch (error) {
    console.error("Failed to run Auto Pilot now:", error);
    redirect(buildAutoPilotRedirect({ error: "run_failed" }));
  }
}
