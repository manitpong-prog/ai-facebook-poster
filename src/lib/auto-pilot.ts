import { and, asc, eq, lte } from "drizzle-orm";

import { db } from "@/db";
import { automationSettings, facebookPages, posts } from "@/db/schema";
import {
  autoWriteNextTopic,
  normalizeTopicSelectionMode,
  topicSelectionModes,
  type TopicSelectionMode,
} from "@/lib/topic-auto-writer";

const DEFAULT_LIMIT_PER_RUN = 3;
export const BANGKOK_TIMEZONE = "Asia/Bangkok";
export const DEFAULT_AUTO_PILOT_TIME = "09:00";
export const DEFAULT_AUTO_PILOT_FREQUENCY_DAYS = 1;

export const autoPilotModes = ["draft_only", "auto_publish"] as const;
export type AutoPilotMode = (typeof autoPilotModes)[number];

export type AutoPilotSettingsInput = {
  isEnabled: boolean;
  mode: AutoPilotMode;
  frequencyDays: number;
  postTime: string;
  topicSelectionMode: TopicSelectionMode;
};

type AutoPilotSettingsRow = typeof automationSettings.$inferSelect;

export type AutoPilotJobResult = {
  workspaceId: string;
  settingsId: string;
  status: "generated" | "no_active_topic" | "failed" | "skipped";
  mode: AutoPilotMode;
  topicTitle?: string;
  postId?: string;
  scheduledForPublish?: boolean;
  nextRunAt?: string | null;
  errorMessage?: string;
};

export type RunAutoPilotJobsResult = {
  ok: boolean;
  now: string;
  limit: number;
  dueCount: number;
  generatedCount: number;
  scheduledForPublishCount: number;
  noTopicCount: number;
  failedCount: number;
  skippedCount: number;
  results: AutoPilotJobResult[];
};

function normalizeLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_LIMIT_PER_RUN;
  }

  return Math.min(Math.max(Math.floor(value), 1), 10);
}

export function normalizeAutoPilotMode(
  value: string | null | undefined,
): AutoPilotMode {
  return value === "auto_publish" ? "auto_publish" : "draft_only";
}

export function normalizeFrequencyDays(
  value: number | string | null | undefined,
) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_AUTO_PILOT_FREQUENCY_DAYS;
  }

  if ([1, 2, 3, 7].includes(parsed)) {
    return parsed;
  }

  return DEFAULT_AUTO_PILOT_FREQUENCY_DAYS;
}

export function normalizePostTime(value: string | null | undefined) {
  const raw = value?.trim() || DEFAULT_AUTO_PILOT_TIME;

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
    return raw;
  }

  return DEFAULT_AUTO_PILOT_TIME;
}

export function normalizeAutoPilotSettingsInput(input: {
  isEnabled?: boolean;
  mode?: string | null;
  frequencyDays?: number | string | null;
  postTime?: string | null;
  topicSelectionMode?: string | null;
}): AutoPilotSettingsInput {
  return {
    isEnabled: Boolean(input.isEnabled),
    mode: normalizeAutoPilotMode(input.mode),
    frequencyDays: normalizeFrequencyDays(input.frequencyDays),
    postTime: normalizePostTime(input.postTime),
    topicSelectionMode: normalizeTopicSelectionMode(input.topicSelectionMode),
  };
}

function getBangkokDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGKOK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

function addDaysToDateParts(
  parts: ReturnType<typeof getBangkokDateParts>,
  days: number,
) {
  const date = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 12),
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function makeBangkokDateTimeUtc(
  parts: ReturnType<typeof getBangkokDateParts>,
  postTime: string,
) {
  const [hourRaw, minuteRaw] = postTime.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, hour - 7, minute),
  );
}

export function getNextAutoPilotRunAt({
  frequencyDays,
  postTime,
  from = new Date(),
  forceAfterFrequency = false,
}: {
  frequencyDays: number;
  postTime: string;
  from?: Date;
  forceAfterFrequency?: boolean;
}) {
  const normalizedFrequencyDays = normalizeFrequencyDays(frequencyDays);
  const normalizedPostTime = normalizePostTime(postTime);
  const todayParts = getBangkokDateParts(from);

  if (forceAfterFrequency) {
    return makeBangkokDateTimeUtc(
      addDaysToDateParts(todayParts, normalizedFrequencyDays),
      normalizedPostTime,
    );
  }

  const todayAtPostTime = makeBangkokDateTimeUtc(
    todayParts,
    normalizedPostTime,
  );

  if (todayAtPostTime > from) {
    return todayAtPostTime;
  }

  return makeBangkokDateTimeUtc(
    addDaysToDateParts(todayParts, normalizedFrequencyDays),
    normalizedPostTime,
  );
}

export async function ensureAutomationSettings(workspaceId: string) {
  const [existingSettings] = await db
    .select()
    .from(automationSettings)
    .where(eq(automationSettings.workspaceId, workspaceId))
    .limit(1);

  if (existingSettings) {
    return existingSettings;
  }

  const [createdSettings] = await db
    .insert(automationSettings)
    .values({
      workspaceId,
      isEnabled: false,
      mode: "draft_only",
      frequencyDays: DEFAULT_AUTO_PILOT_FREQUENCY_DAYS,
      postTime: DEFAULT_AUTO_PILOT_TIME,
      topicSelectionMode: topicSelectionModes[0],
      timezone: BANGKOK_TIMEZONE,
      nextRunAt: null,
      updatedAt: new Date(),
    })
    .returning();

  if (!createdSettings) {
    throw new Error("Failed to create automation settings");
  }

  return createdSettings;
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

async function getDefaultConnectedFacebookPage(workspaceId: string) {
  const [page] = await db
    .select({
      id: facebookPages.id,
      pageId: facebookPages.pageId,
      accessTokenEncrypted: facebookPages.accessTokenEncrypted,
      status: facebookPages.status,
    })
    .from(facebookPages)
    .where(
      and(
        eq(facebookPages.workspaceId, workspaceId),
        eq(facebookPages.status, "connected"),
      ),
    )
    .limit(1);

  if (!page?.pageId || !page.accessTokenEncrypted) {
    return null;
  }

  return page;
}

async function scheduleGeneratedPostForImmediatePublish({
  workspaceId,
  postId,
  now,
}: {
  workspaceId: string;
  postId: string;
  now: Date;
}) {
  const facebookPage = await getDefaultConnectedFacebookPage(workspaceId);

  if (!facebookPage) {
    throw new Error("No connected Facebook Page found for Auto Publish mode.");
  }

  await db
    .update(posts)
    .set({
      facebookPageId: facebookPage.id,
      status: "scheduled",
      publishMode: "schedule",
      scheduledAt: now,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, postId), eq(posts.workspaceId, workspaceId)));
}

async function runClaimedAutoPilotJob({
  settings,
  now,
  nextRunAt,
}: {
  settings: AutoPilotSettingsRow;
  now: Date;
  nextRunAt: Date;
}): Promise<AutoPilotJobResult> {
  const mode = normalizeAutoPilotMode(settings.mode);
  const selectionMode = normalizeTopicSelectionMode(
    settings.topicSelectionMode,
  );

  try {
    const writeResult = await autoWriteNextTopic({
      workspaceId: settings.workspaceId,
      userId: null,
      selectionMode,
    });

    if (writeResult.status === "no_active_topic") {
      const lastResult = "ยังไม่มีหัวข้อสถานะรอใช้สำหรับ Auto Pilot";

      await db
        .update(automationSettings)
        .set({
          lastResult,
          lastErrorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(automationSettings.id, settings.id));

      return {
        workspaceId: settings.workspaceId,
        settingsId: settings.id,
        status: "no_active_topic",
        mode,
        nextRunAt: nextRunAt.toISOString(),
        errorMessage: lastResult,
      };
    }

    let scheduledForPublish = false;

    if (mode === "auto_publish") {
      await scheduleGeneratedPostForImmediatePublish({
        workspaceId: settings.workspaceId,
        postId: writeResult.postId,
        now,
      });
      scheduledForPublish = true;
    }

    await db
      .update(automationSettings)
      .set({
        lastPostId: writeResult.postId,
        lastResult: scheduledForPublish
          ? "AI เขียนจากหัวข้อและส่งเข้าคิวโพสต์อัตโนมัติแล้ว"
          : "AI เขียนจากหัวข้อและบันทึกเป็น Draft/Generated แล้ว",
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(automationSettings.id, settings.id));

    return {
      workspaceId: settings.workspaceId,
      settingsId: settings.id,
      status: "generated",
      mode,
      topicTitle: writeResult.topicTitle,
      postId: writeResult.postId,
      scheduledForPublish,
      nextRunAt: nextRunAt.toISOString(),
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    await db
      .update(automationSettings)
      .set({
        lastResult: "Auto Pilot failed",
        lastErrorMessage: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(automationSettings.id, settings.id));

    return {
      workspaceId: settings.workspaceId,
      settingsId: settings.id,
      status: "failed",
      mode,
      nextRunAt: nextRunAt.toISOString(),
      errorMessage,
    };
  }
}

export async function runAutoPilotForWorkspaceNow({
  workspaceId,
  now = new Date(),
}: {
  workspaceId: string;
  now?: Date;
}): Promise<AutoPilotJobResult> {
  const settings = await ensureAutomationSettings(workspaceId);
  const nextRunAt = getNextAutoPilotRunAt({
    frequencyDays: settings.frequencyDays,
    postTime: settings.postTime,
    from: now,
    forceAfterFrequency: true,
  });

  await db
    .update(automationSettings)
    .set({
      lastRunAt: now,
      nextRunAt,
      lastResult: "running",
      lastErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(automationSettings.id, settings.id));

  return runClaimedAutoPilotJob({ settings, now, nextRunAt });
}

export async function runDueAutoPilotJobs({
  limit: rawLimit,
  now = new Date(),
}: {
  limit?: number;
  now?: Date;
} = {}): Promise<RunAutoPilotJobsResult> {
  const limit = normalizeLimit(rawLimit);

  const dueSettings = await db
    .select()
    .from(automationSettings)
    .where(
      and(
        eq(automationSettings.isEnabled, true),
        lte(automationSettings.nextRunAt, now),
      ),
    )
    .orderBy(asc(automationSettings.nextRunAt))
    .limit(limit);

  const results: AutoPilotJobResult[] = [];

  for (const settings of dueSettings) {
    const nextRunAt = getNextAutoPilotRunAt({
      frequencyDays: settings.frequencyDays,
      postTime: settings.postTime,
      from: now,
      forceAfterFrequency: true,
    });

    const [claimedSettings] = await db
      .update(automationSettings)
      .set({
        lastRunAt: now,
        nextRunAt,
        lastResult: "running",
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(automationSettings.id, settings.id),
          eq(automationSettings.isEnabled, true),
          lte(automationSettings.nextRunAt, now),
        ),
      )
      .returning();

    if (!claimedSettings) {
      results.push({
        workspaceId: settings.workspaceId,
        settingsId: settings.id,
        status: "skipped",
        mode: normalizeAutoPilotMode(settings.mode),
        errorMessage: "Auto Pilot job was already claimed by another run.",
      });
      continue;
    }

    results.push(
      await runClaimedAutoPilotJob({
        settings: claimedSettings,
        now,
        nextRunAt,
      }),
    );
  }

  const generatedCount = results.filter(
    (result) => result.status === "generated",
  ).length;
  const scheduledForPublishCount = results.filter(
    (result) => result.scheduledForPublish,
  ).length;
  const noTopicCount = results.filter(
    (result) => result.status === "no_active_topic",
  ).length;
  const failedCount = results.filter(
    (result) => result.status === "failed",
  ).length;
  const skippedCount = results.filter(
    (result) => result.status === "skipped",
  ).length;

  return {
    ok: failedCount === 0,
    now: now.toISOString(),
    limit,
    dueCount: dueSettings.length,
    generatedCount,
    scheduledForPublishCount,
    noTopicCount,
    failedCount,
    skippedCount,
    results,
  };
}
