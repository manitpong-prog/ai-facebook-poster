import { db } from "@/db";
import { autoPilotRunLogs } from "@/db/schema";
import type { AutoPilotJobResult } from "@/lib/auto-pilot";
import type { PublishScheduledPostsResult } from "@/lib/scheduled-publisher";

export type AutoPilotRunTrigger = "manual" | "cron";

function getPublishItemForPost(
  autoPilotResult: AutoPilotJobResult,
  publishResult?: PublishScheduledPostsResult | null,
) {
  if (!autoPilotResult.postId || !publishResult) {
    return null;
  }

  return (
    publishResult.results.find(
      (item) => item.postId === autoPilotResult.postId,
    ) ?? null
  );
}

function deriveRunLogStatus({
  autoPilotResult,
  publishResult,
}: {
  autoPilotResult: AutoPilotJobResult;
  publishResult?: PublishScheduledPostsResult | null;
}) {
  if (autoPilotResult.status !== "generated") {
    return autoPilotResult.status;
  }

  if (!autoPilotResult.scheduledForPublish) {
    return "generated";
  }

  const publishItem = getPublishItemForPost(autoPilotResult, publishResult);

  if (publishItem?.status === "published") {
    return "published";
  }

  if (publishItem?.status === "failed") {
    return "publish_failed";
  }

  if (publishItem?.status === "skipped") {
    return "publish_skipped";
  }

  return "publish_pending";
}

function buildAutoPilotSummary(autoPilotResult: AutoPilotJobResult) {
  const parts = [
    `status=${autoPilotResult.status}`,
    `mode=${autoPilotResult.mode}`,
  ];

  if (autoPilotResult.topicTitle) {
    parts.push(`topic=${autoPilotResult.topicTitle}`);
  }

  if (autoPilotResult.postId) {
    parts.push(`postId=${autoPilotResult.postId}`);
  }

  if (autoPilotResult.scheduledForPublish) {
    parts.push("scheduledForPublish=true");
  }

  return parts.join(" | ");
}

function buildPublishSummary(
  publishResult?: PublishScheduledPostsResult | null,
) {
  if (!publishResult) {
    return null;
  }

  return [
    `due=${publishResult.dueCount}`,
    `published=${publishResult.publishedCount}`,
    `failed=${publishResult.failedCount}`,
    `skipped=${publishResult.skippedCount}`,
  ].join(" | ");
}

function getPublishErrorMessage({
  autoPilotResult,
  publishResult,
}: {
  autoPilotResult: AutoPilotJobResult;
  publishResult?: PublishScheduledPostsResult | null;
}) {
  const publishItem = getPublishItemForPost(autoPilotResult, publishResult);

  if (publishItem?.status === "failed" && publishItem.errorMessage) {
    return publishItem.errorMessage;
  }

  if (autoPilotResult.errorMessage) {
    return autoPilotResult.errorMessage;
  }

  return null;
}

export async function recordAutoPilotRunLog({
  trigger,
  autoPilotResult,
  publishResult,
  startedAt,
  finishedAt = new Date(),
}: {
  trigger: AutoPilotRunTrigger;
  autoPilotResult: AutoPilotJobResult;
  publishResult?: PublishScheduledPostsResult | null;
  startedAt: Date;
  finishedAt?: Date;
}) {
  const publishItem = getPublishItemForPost(autoPilotResult, publishResult);

  await db.insert(autoPilotRunLogs).values({
    workspaceId: autoPilotResult.workspaceId,
    automationSettingId: autoPilotResult.settingsId,
    postId: autoPilotResult.postId ?? null,
    runTrigger: trigger,
    mode: autoPilotResult.mode,
    status: deriveRunLogStatus({ autoPilotResult, publishResult }),
    topicTitle: autoPilotResult.topicTitle ?? publishItem?.topic ?? null,
    scheduledForPublish: Boolean(autoPilotResult.scheduledForPublish),
    autoPilotSummary: buildAutoPilotSummary(autoPilotResult),
    publishSummary: buildPublishSummary(publishResult),
    errorMessage: getPublishErrorMessage({ autoPilotResult, publishResult }),
    dueCount: publishResult?.dueCount ?? 0,
    publishedCount: publishResult?.publishedCount ?? 0,
    failedCount: publishResult?.failedCount ?? 0,
    skippedCount: publishResult?.skippedCount ?? 0,
    startedAt,
    finishedAt,
    updatedAt: finishedAt,
  });
}

export async function recordAutoPilotUnknownFailureLog({
  workspaceId,
  trigger,
  errorMessage,
  startedAt,
  finishedAt = new Date(),
}: {
  workspaceId: string;
  trigger: AutoPilotRunTrigger;
  errorMessage: string;
  startedAt: Date;
  finishedAt?: Date;
}) {
  await db.insert(autoPilotRunLogs).values({
    workspaceId,
    runTrigger: trigger,
    mode: "unknown",
    status: "failed",
    autoPilotSummary: "Auto Pilot failed before returning a normal job result.",
    errorMessage,
    startedAt,
    finishedAt,
    updatedAt: finishedAt,
  });
}
