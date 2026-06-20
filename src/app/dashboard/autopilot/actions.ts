"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { automationSettings } from "@/db/schema";
import {
  recordAutoPilotRunLog,
  recordAutoPilotUnknownFailureLog,
} from "@/lib/auto-pilot-run-logs";
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

function buildPublishFailureDetails(
  publishResult: Awaited<ReturnType<typeof publishDueScheduledPosts>>,
) {
  const failedItems = publishResult.results.filter(
    (result) => result.status === "failed",
  );

  if (failedItems.length === 0) {
    return "ไม่พบรายละเอียด error จากตัวโพสต์ กรุณาดู terminal เพิ่มเติม";
  }

  return failedItems
    .map((item, index) => {
      const details = [
        `${index + 1}. โพสต์: ${item.topic}`,
        `Post ID ในระบบ: ${item.postId}`,
        `Error: ${item.errorMessage || "ไม่พบข้อความ error"}`,
      ];

      return details.join("\n");
    })
    .join("\n\n");
}

function buildPublishDiagnosticSummary(
  publishResult: Awaited<ReturnType<typeof publishDueScheduledPosts>>,
) {
  return [
    `dueCount=${publishResult.dueCount}`,
    `publishedCount=${publishResult.publishedCount}`,
    `failedCount=${publishResult.failedCount}`,
    `skippedCount=${publishResult.skippedCount}`,
  ].join(" | ");
}

async function updateAutoPilotPublishDiagnostics({
  settingsId,
  result,
  errorMessage,
}: {
  settingsId: string;
  result: string;
  errorMessage: string | null;
}) {
  await db
    .update(automationSettings)
    .set({
      lastResult: result,
      lastErrorMessage: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(automationSettings.id, settingsId));
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
  const startedAt = now;
  let redirectParams: Record<string, string>;

  try {
    const autoPilotResult = await runAutoPilotForWorkspaceNow({
      workspaceId: workspaceResult.currentMembership.workspaceId,
      now,
    });

    const publishResult = await publishDueScheduledPosts({ limit: 5, now });

    await recordAutoPilotRunLog({
      trigger: "manual",
      autoPilotResult,
      publishResult,
      startedAt,
      finishedAt: new Date(),
    });

    if (
      autoPilotResult.status === "generated" &&
      autoPilotResult.scheduledForPublish
    ) {
      if (publishResult.publishedCount > 0) {
        await updateAutoPilotPublishDiagnostics({
          settingsId: autoPilotResult.settingsId,
          result: `AI เขียนและโพสต์ลง Facebook สำเร็จ (${buildPublishDiagnosticSummary(publishResult)})`,
          errorMessage: null,
        });
      } else if (publishResult.failedCount > 0) {
        await updateAutoPilotPublishDiagnostics({
          settingsId: autoPilotResult.settingsId,
          result: `AI เขียนสำเร็จ แต่โพสต์ลง Facebook ไม่สำเร็จ (${buildPublishDiagnosticSummary(publishResult)})`,
          errorMessage: buildPublishFailureDetails(publishResult),
        });
      } else {
        await updateAutoPilotPublishDiagnostics({
          settingsId: autoPilotResult.settingsId,
          result: `AI เขียนสำเร็จและส่งเข้าคิวโพสต์แล้ว แต่รอบ publish ยังไม่พบรายการที่พร้อมโพสต์ (${buildPublishDiagnosticSummary(publishResult)})`,
          errorMessage:
            "ระบบสร้างโพสต์และตั้งเวลาเป็นตอนนี้แล้ว แต่ publish worker ยังไม่พบรายการ due ในรอบเดียวกัน ลองกดรัน Auto Pilot ตอนนี้อีกครั้ง หรือเปิด /api/cron/publish-scheduled เพื่อให้ worker เช็กคิวโพสต์",
        });
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/autopilot");
    revalidatePath("/dashboard/topics");
    revalidatePath("/dashboard/posts");

    const status =
      autoPilotResult.status === "generated" &&
      autoPilotResult.scheduledForPublish &&
      publishResult.failedCount > 0
        ? "publish_failed"
        : autoPilotResult.status === "generated" &&
            autoPilotResult.scheduledForPublish &&
            publishResult.publishedCount > 0
          ? "published"
          : autoPilotResult.status;

    redirectParams = {
      ran: "1",
      status,
      published: String(publishResult.publishedCount),
      failed: String(publishResult.failedCount),
      due: String(publishResult.dueCount),
      skipped: String(publishResult.skippedCount),
    };

    if (autoPilotResult.postId) {
      redirectParams.postId = autoPilotResult.postId;
    }
  } catch (error) {
    console.error("Failed to run Auto Pilot now:", error);

    if (workspaceResult.currentMembership) {
      await recordAutoPilotUnknownFailureLog({
        workspaceId: workspaceResult.currentMembership.workspaceId,
        trigger: "manual",
        errorMessage: getErrorMessage(error),
        startedAt,
        finishedAt: new Date(),
      });
    }

    redirectParams = { error: "run_failed" };
  }

  redirect(buildAutoPilotRedirect(redirectParams));
}
