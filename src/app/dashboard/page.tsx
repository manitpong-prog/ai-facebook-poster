import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { db } from "@/db";
import {
  autoPilotRunLogs,
  contentTopics,
  facebookPages,
  posts,
} from "@/db/schema";
import { ensureAutomationSettings } from "@/lib/auto-pilot";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";
import { ensureDefaultWritingProfile } from "@/lib/workspace";

const autoPilotModeLabels: Record<string, string> = {
  draft_only: "เขียนไว้ให้ตรวจก่อน",
  auto_publish: "เขียนแล้วโพสต์อัตโนมัติ",
};

const topicSelectionModeLabels: Record<string, string> = {
  ordered: "เรียงตามลำดับคิว",
  random: "สุ่มจากหัวข้อที่รอใช้",
};

const runLogStatusLabels: Record<string, string> = {
  generated: "AI เขียนแล้ว",
  published: "โพสต์สำเร็จ",
  publish_failed: "โพสต์ Facebook ไม่สำเร็จ",
  publish_pending: "รอโพสต์",
  publish_skipped: "ข้ามการโพสต์",
  no_active_topic: "ไม่มีหัวข้อรอใช้",
  failed: "ล้มเหลว",
  skipped: "ถูกข้าม",
};

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function getHealthBadgeClass(isReady: boolean) {
  return isReady
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
    : "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

function getRunLogStatusClass(status: string | null | undefined) {
  if (status === "published" || status === "generated") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }

  if (
    status === "publish_pending" ||
    status === "publish_skipped" ||
    status === "skipped" ||
    status === "no_active_topic"
  ) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-red-500/30 bg-red-500/10 text-red-100";
}

function getAutoPilotStatusLabel(isEnabled: boolean) {
  return isEnabled ? "เปิดใช้งาน" : "ปิดอยู่";
}

async function getDashboardSummaryData(workspaceId: string) {
  const [
    defaultWritingProfile,
    automationSettings,
    topicRows,
    postRows,
    connectedPage,
    latestRunLog,
    nextScheduledPost,
    latestPostedPost,
  ] = await Promise.all([
    ensureDefaultWritingProfile(workspaceId),
    ensureAutomationSettings(workspaceId),
    db
      .select({ status: contentTopics.status })
      .from(contentTopics)
      .where(eq(contentTopics.workspaceId, workspaceId)),
    db
      .select({ status: posts.status })
      .from(posts)
      .where(eq(posts.workspaceId, workspaceId)),
    db
      .select({
        pageName: facebookPages.pageName,
        pageId: facebookPages.pageId,
        status: facebookPages.status,
        accessTokenEncrypted: facebookPages.accessTokenEncrypted,
        lastTestedAt: facebookPages.lastTestedAt,
      })
      .from(facebookPages)
      .where(
        and(
          eq(facebookPages.workspaceId, workspaceId),
          eq(facebookPages.status, "connected"),
        ),
      )
      .limit(1),
    db
      .select({
        status: autoPilotRunLogs.status,
        runTrigger: autoPilotRunLogs.runTrigger,
        mode: autoPilotRunLogs.mode,
        topicTitle: autoPilotRunLogs.topicTitle,
        postId: autoPilotRunLogs.postId,
        errorMessage: autoPilotRunLogs.errorMessage,
        dueCount: autoPilotRunLogs.dueCount,
        publishedCount: autoPilotRunLogs.publishedCount,
        failedCount: autoPilotRunLogs.failedCount,
        skippedCount: autoPilotRunLogs.skippedCount,
        createdAt: autoPilotRunLogs.createdAt,
        finishedAt: autoPilotRunLogs.finishedAt,
      })
      .from(autoPilotRunLogs)
      .where(eq(autoPilotRunLogs.workspaceId, workspaceId))
      .orderBy(desc(autoPilotRunLogs.createdAt))
      .limit(1),
    db
      .select({
        id: posts.id,
        topic: posts.topic,
        scheduledAt: posts.scheduledAt,
        status: posts.status,
      })
      .from(posts)
      .where(
        and(eq(posts.workspaceId, workspaceId), eq(posts.status, "scheduled")),
      )
      .orderBy(asc(posts.scheduledAt))
      .limit(1),
    db
      .select({
        id: posts.id,
        topic: posts.topic,
        facebookPostUrl: posts.facebookPostUrl,
        postedAt: posts.postedAt,
      })
      .from(posts)
      .where(
        and(eq(posts.workspaceId, workspaceId), eq(posts.status, "posted")),
      )
      .orderBy(desc(posts.postedAt))
      .limit(1),
  ]);

  return {
    defaultWritingProfile,
    automationSettings,
    topicRows,
    postRows,
    connectedPage,
    latestRunLog,
    nextScheduledPost,
    latestPostedPost,
  };
}

export default async function DashboardPage() {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลด Dashboard ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(error)}
      />
    );
  }

  if (!session) {
    redirect("/login");
  }

  if (!currentMembership) {
    return <DashboardLoadError title="ไม่พบ Workspace" />;
  }

  let summaryData: Awaited<ReturnType<typeof getDashboardSummaryData>>;

  try {
    summaryData = await getDashboardSummaryData(currentMembership.workspaceId);
  } catch (dashboardError) {
    return (
      <DashboardLoadError
        title="โหลด Dashboard Summary ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(dashboardError)}
      />
    );
  }

  const {
    defaultWritingProfile,
    automationSettings,
    topicRows,
    postRows,
    connectedPage,
    latestRunLog,
    nextScheduledPost,
    latestPostedPost,
  } = summaryData;

  const topicCounts = topicRows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    {
      active: 0,
      paused: 0,
      used: 0,
      archived: 0,
    },
  );

  const postCounts = postRows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    {
      draft: 0,
      generated: 0,
      scheduled: 0,
      posting: 0,
      posted: 0,
      cancelled: 0,
      error: 0,
    },
  );

  const [page] = connectedPage;
  const [runLog] = latestRunLog;
  const [scheduledPost] = nextScheduledPost;
  const [postedPost] = latestPostedPost;

  const hasFacebookPage = Boolean(page?.pageId && page.accessTokenEncrypted);
  const hasTopics = topicCounts.active > 0;
  const hasGeminiApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const autoPilotReady = Boolean(
    automationSettings.isEnabled && hasTopics && hasGeminiApiKey,
  );
  const autoPublishReady = Boolean(autoPilotReady && hasFacebookPage);
  const modeLabel =
    autoPilotModeLabels[automationSettings.mode] ?? automationSettings.mode;
  const topicSelectionLabel =
    topicSelectionModeLabels[automationSettings.topicSelectionMode] ??
    automationSettings.topicSelectionMode;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold">
            ภาพรวมระบบโพสต์ Facebook อัตโนมัติ
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            ดูสถานะ Auto Pilot, Topic Queue, Facebook Page, โพสต์ที่รอคิว
            และผลลัพธ์ล่าสุดได้จากหน้าเดียว
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/topics"
            className="rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400"
          >
            + เพิ่มหัวข้อ
          </Link>
          <Link
            href="/dashboard/autopilot"
            className="rounded-xl border border-emerald-400/40 px-4 py-3 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10"
          >
            ตั้ง Auto Pilot
          </Link>
          <Link
            href="/dashboard/deploy"
            className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500"
          >
            เช็กก่อน Deploy
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">Auto Pilot</div>
          <div className="mt-2 text-2xl font-bold">
            {getAutoPilotStatusLabel(automationSettings.isEnabled)}
          </div>
          <div
            className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getHealthBadgeClass(
              autoPilotReady,
            )}`}
          >
            {autoPilotReady ? "พร้อมรัน" : "ต้องเช็กก่อนรัน"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">หัวข้อรอใช้</div>
          <div className="mt-2 text-2xl font-bold">{topicCounts.active}</div>
          <div className="mt-4 text-xs leading-5 text-slate-500">
            ใช้แล้ว {topicCounts.used} · พักไว้ {topicCounts.paused} · เก็บถาวร{" "}
            {topicCounts.archived}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">โพสต์สำเร็จ</div>
          <div className="mt-2 text-2xl font-bold">{postCounts.posted}</div>
          <div className="mt-4 text-xs leading-5 text-slate-500">
            รอคิว {postCounts.scheduled} · Error {postCounts.error}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="text-sm text-slate-400">Facebook Page</div>
          <div className="mt-2 text-lg font-bold">
            {hasFacebookPage
              ? page?.pageName || "เชื่อมต่อแล้ว"
              : "ยังไม่พร้อม"}
          </div>
          <div
            className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getHealthBadgeClass(
              hasFacebookPage,
            )}`}
          >
            {hasFacebookPage ? "พร้อมโพสต์" : "ต้องเชื่อมเพจก่อน"}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">สถานะ Auto Pilot</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  สรุปการตั้งค่าหลักและรอบถัดไปของระบบอัตโนมัติ
                </p>
              </div>
              <Link
                href="/dashboard/autopilot"
                className="rounded-xl border border-blue-400/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10"
              >
                เปิดหน้า Auto Pilot
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs text-slate-500">โหมด</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {modeLabel}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs text-slate-500">วิธีเลือกหัวข้อ</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {topicSelectionLabel}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs text-slate-500">ความถี่</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  ทุก {automationSettings.frequencyDays} วัน เวลา{" "}
                  {automationSettings.postTime}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs text-slate-500">รอบถัดไป</div>
                <div className="mt-1 text-sm font-semibold text-slate-100">
                  {formatDate(automationSettings.nextRunAt)}
                </div>
              </div>
            </div>

            {!autoPublishReady && automationSettings.mode === "auto_publish" ? (
              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                โหมดโพสต์อัตโนมัติต้องมีหัวข้อรอใช้, GEMINI_API_KEY และ Facebook
                Page ที่เชื่อมต่อพร้อมใช้งาน
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">ประวัติล่าสุด</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  รอบล่าสุดของ Auto Pilot และผลการโพสต์จากคิว
                </p>
              </div>
              <Link
                href="/dashboard/autopilot"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
              >
                ดู Log ทั้งหมด
              </Link>
            </div>

            {runLog ? (
              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${getRunLogStatusClass(
                      runLog.status,
                    )}`}
                  >
                    {runLogStatusLabels[runLog.status] ?? runLog.status}
                  </span>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                    {runLog.runTrigger === "cron" ? "Cron" : "กดรันเอง"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatDate(runLog.finishedAt ?? runLog.createdAt)}
                  </span>
                </div>
                <div className="mt-4 text-sm leading-6 text-slate-300">
                  หัวข้อ: {runLog.topicTitle || "-"}
                </div>
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  due={runLog.dueCount}, published={runLog.publishedCount},
                  failed={runLog.failedCount}, skipped={runLog.skippedCount}
                </div>
                {runLog.errorMessage ? (
                  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
                    {runLog.errorMessage}
                  </div>
                ) : null}
                {runLog.postId ? (
                  <Link
                    href={`/dashboard/posts/${runLog.postId}`}
                    className="mt-4 inline-flex text-sm font-semibold text-blue-200 underline underline-offset-4"
                  >
                    เปิดโพสต์จากรอบนี้
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
                ยังไม่มีประวัติ Auto Pilot ลองกดรันจากหน้า Auto Pilot
                เพื่อสร้างรายการแรก
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">คิวโพสต์</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs text-slate-500">โพสต์ตั้งเวลาถัดไป</div>
                {scheduledPost ? (
                  <div className="mt-2">
                    <Link
                      href={`/dashboard/posts/${scheduledPost.id}`}
                      className="font-semibold text-blue-200 underline underline-offset-4"
                    >
                      {scheduledPost.topic}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(scheduledPost.scheduledAt)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-slate-400">
                    ยังไม่มีโพสต์ที่ตั้งเวลาไว้
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs text-slate-500">
                  โพสต์ล่าสุดที่เผยแพร่
                </div>
                {postedPost ? (
                  <div className="mt-2">
                    <Link
                      href={`/dashboard/posts/${postedPost.id}`}
                      className="font-semibold text-blue-200 underline underline-offset-4"
                    >
                      {postedPost.topic}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">
                      {formatDate(postedPost.postedAt)}
                    </div>
                    {postedPost.facebookPostUrl ? (
                      <a
                        href={postedPost.facebookPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs font-semibold text-emerald-200 underline underline-offset-4"
                      >
                        เปิดบน Facebook
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-2 text-slate-400">
                    ยังไม่มีโพสต์ที่เผยแพร่แล้ว
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">สไตล์การเขียน</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div>
                <div className="text-slate-500">ชื่อสไตล์</div>
                <div>{defaultWritingProfile.name}</div>
              </div>
              <div>
                <div className="text-slate-500">โทนภาษา</div>
                <div>{defaultWritingProfile.tone || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">จำนวนคำสูงสุด</div>
                <div>{defaultWritingProfile.maxWords} คำ</div>
              </div>
            </div>
            <Link
              href="/dashboard/style"
              className="mt-5 inline-flex rounded-xl border border-blue-400/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10"
            >
              แก้ไขสไตล์การเขียน
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">ทางลัด</h2>
            <div className="mt-5 grid gap-3 text-sm font-semibold">
              <Link
                href="/dashboard/posts/new"
                className="rounded-xl border border-slate-700 px-4 py-3 text-slate-200 hover:border-slate-500"
              >
                สร้าง Draft เอง
              </Link>
              <Link
                href="/dashboard/facebook"
                className="rounded-xl border border-slate-700 px-4 py-3 text-slate-200 hover:border-slate-500"
              >
                ตั้งค่า Facebook Page
              </Link>
              <Link
                href="/dashboard/posts"
                className="rounded-xl border border-slate-700 px-4 py-3 text-slate-200 hover:border-slate-500"
              >
                ดูรายการโพสต์ทั้งหมด
              </Link>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
