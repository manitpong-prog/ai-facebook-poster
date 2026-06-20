import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/db";
import { contentTopics, facebookPages, posts } from "@/db/schema";
import { ensureAutomationSettings } from "@/lib/auto-pilot";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

import {
  runAutoPilotNowAction,
  updateAutoPilotSettingsAction,
} from "./actions";

type AutoPilotPageProps = {
  searchParams?: Promise<{
    saved?: string;
    ran?: string;
    status?: string;
    published?: string;
    failed?: string;
    due?: string;
    skipped?: string;
    postId?: string;
    error?: string;
  }>;
};

const errorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วทำอีกครั้ง",
  workspace_missing: "ไม่พบ Workspace สำหรับบันทึก Auto Pilot",
  save_failed: "บันทึก Auto Pilot ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  run_failed:
    "รัน Auto Pilot ไม่สำเร็จตั้งแต่ระดับ server action กรุณาดู Error ล่าสุดและ terminal",
};

const runStatusLabels: Record<string, string> = {
  generated: "Auto Pilot เลือกหัวข้อและให้ AI เขียนโพสต์สำเร็จแล้ว",
  published: "Auto Pilot เขียนและโพสต์ลง Facebook Page สำเร็จแล้ว",
  publish_failed:
    "AI เขียนโพสต์สำเร็จแล้ว แต่ขั้นตอนโพสต์ลง Facebook Page ไม่สำเร็จ ดูรายละเอียดที่ Error ล่าสุด",
  no_active_topic: "ยังไม่มีหัวข้อสถานะรอใช้สำหรับ Auto Pilot",
  failed: "Auto Pilot ทำงานไม่สำเร็จ กรุณาดูรายละเอียดในสถานะล่าสุด",
  skipped: "รอบนี้ถูกข้าม เพราะมีงานอื่นกำลังรันอยู่",
};

const postStatusLabels: Record<string, string> = {
  draft: "Draft",
  generated: "Generated",
  scheduled: "Scheduled",
  posting: "Posting",
  posted: "Posted",
  cancelled: "Cancelled",
  error: "Error",
};

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function getDiagnosticCategory(errorMessage: string | null) {
  if (!errorMessage) {
    return null;
  }

  const normalized = errorMessage.toLowerCase();

  if (
    normalized.includes("gemini") ||
    normalized.includes("generatecontent") ||
    normalized.includes("api_key")
  ) {
    return {
      title: "น่าจะติดที่ Gemini API",
      description:
        "เช็ก GEMINI_API_KEY, GEMINI_MODEL, quota/rate limit และลองสร้างโพสต์แบบ manual จากหัวข้อเดียวกันอีกครั้ง",
    };
  }

  if (
    normalized.includes("facebook") ||
    normalized.includes("oauth") ||
    normalized.includes("#200") ||
    normalized.includes("page token") ||
    normalized.includes("permission") ||
    normalized.includes("access token")
  ) {
    return {
      title: "น่าจะติดที่ Facebook Page / Token",
      description:
        "เช็ก Page Access Token ใน /dashboard/facebook ว่ายังเป็นตัวเต็มและยังโพสต์ผ่าน Graph API ได้อยู่หรือไม่",
    };
  }

  if (
    normalized.includes("no active topic") ||
    normalized.includes("หัวข้อ") ||
    normalized.includes("topic")
  ) {
    return {
      title: "น่าจะติดที่ Topic Queue",
      description:
        "เช็กว่ามีหัวข้อสถานะรอใช้ใน /dashboard/topics อย่างน้อย 1 หัวข้อ",
    };
  }

  return {
    title: "ยังจัดหมวด error ไม่ได้",
    description:
      "อ่านข้อความ Error ล่าสุดด้านล่าง และดู terminal ที่รัน npm run dev เพิ่มเติม",
  };
}

function statusBadgeClass(isOk: boolean) {
  return isOk
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
    : "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

export default async function AutoPilotPage({ searchParams }: AutoPilotPageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลด Auto Pilot ไม่สำเร็จ"
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

  let settings;
  let topics;
  let connectedPage;
  let lastPost:
    | {
        id: string;
        topic: string;
        status: string;
        scheduledAt: Date | null;
        postedAt: Date | null;
        facebookPostId: string | null;
        facebookPostUrl: string | null;
        errorMessage: string | null;
      }
    | null = null;

  try {
    settings = await ensureAutomationSettings(currentMembership.workspaceId);

    topics = await db
      .select({ status: contentTopics.status })
      .from(contentTopics)
      .where(eq(contentTopics.workspaceId, currentMembership.workspaceId));

    [connectedPage] = await db
      .select({
        id: facebookPages.id,
        pageName: facebookPages.pageName,
        pageId: facebookPages.pageId,
        status: facebookPages.status,
        accessTokenEncrypted: facebookPages.accessTokenEncrypted,
      })
      .from(facebookPages)
      .where(
        and(
          eq(facebookPages.workspaceId, currentMembership.workspaceId),
          eq(facebookPages.status, "connected"),
        ),
      )
      .limit(1);

    if (settings.lastPostId) {
      const [loadedLastPost] = await db
        .select({
          id: posts.id,
          topic: posts.topic,
          status: posts.status,
          scheduledAt: posts.scheduledAt,
          postedAt: posts.postedAt,
          facebookPostId: posts.facebookPostId,
          facebookPostUrl: posts.facebookPostUrl,
          errorMessage: posts.errorMessage,
        })
        .from(posts)
        .where(
          and(
            eq(posts.workspaceId, currentMembership.workspaceId),
            eq(posts.id, settings.lastPostId),
          ),
        )
        .limit(1);

      lastPost = loadedLastPost ?? null;
    }
  } catch (loadError) {
    return (
      <DashboardLoadError
        title="โหลด Auto Pilot ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(loadError)}
      />
    );
  }

  const query = await searchParams;
  const errorMessage = query?.error ? errorLabels[query.error] : "";
  const runStatusMessage = query?.status ? runStatusLabels[query.status] : "";
  const diagnosticCategory = getDiagnosticCategory(
    settings.lastErrorMessage || lastPost?.errorMessage || null,
  );

  const topicCounts = topics.reduce(
    (acc, topic) => {
      acc[topic.status] += 1;
      return acc;
    },
    {
      active: 0,
      paused: 0,
      used: 0,
      archived: 0,
    },
  );

  const hasGeminiApiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const hasConnectedPage = Boolean(connectedPage?.pageId);
  const hasFacebookToken = Boolean(connectedPage?.accessTokenEncrypted?.trim());
  const isAutoPublishMode = settings.mode === "auto_publish";
  const lastPostStatusLabel = lastPost
    ? postStatusLabels[lastPost.status] || lastPost.status
    : "-";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Auto Pilot</p>
          <h1 className="mt-2 text-3xl font-bold">เขียนและโพสต์อัตโนมัติ</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            ตั้งรอบให้ระบบเลือกหัวข้อจาก Topic Queue แล้วให้ Gemini เขียนโพสต์อัตโนมัติ สามารถเลือกได้ว่าจะเก็บไว้ตรวจ หรือส่งเข้าคิวโพสต์อัตโนมัติ
          </p>
        </div>
        <Link
          href="/dashboard/topics"
          className="rounded-xl border border-blue-400/40 px-4 py-3 text-center text-sm font-semibold text-blue-100 hover:bg-blue-500/10"
        >
          ไปที่ Topic Queue
        </Link>
      </div>

      {query?.saved ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          บันทึกการตั้งค่า Auto Pilot แล้ว
        </div>
      ) : null}

      {runStatusMessage ? (
        <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
          <div>{runStatusMessage}</div>
          <div className="mt-2 text-xs text-blue-100/75">
            Cron summary: due={query?.due ?? "-"}, published={query?.published ?? "-"}, failed={query?.failed ?? "-"}, skipped={query?.skipped ?? "-"}
          </div>
          {query?.postId ? (
            <Link
              href={`/dashboard/posts/${query.postId}`}
              className="mt-2 inline-flex font-semibold underline underline-offset-4"
            >
              เปิดโพสต์ที่สร้างจาก Auto Pilot
            </Link>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          action={updateAutoPilotSettingsAction}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="text-xl font-semibold">ตั้งค่า Auto Pilot</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ช่วงแรกแนะนำโหมด “เขียนไว้ให้ตรวจก่อน” จนมั่นใจคุณภาพบทความ แล้วค่อยเปิดโหมดโพสต์อัตโนมัติ
          </p>

          <div className="mt-6 space-y-5">
            <label className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
              <input
                type="checkbox"
                name="isEnabled"
                defaultChecked={settings.isEnabled}
                className="mt-1 h-4 w-4 accent-blue-500"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-100">
                  เปิด Auto Pilot
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  เมื่อเปิดแล้ว cron จะเลือกหัวข้อจากคิวตามเวลาที่ตั้งไว้
                </span>
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">โหมดการทำงาน</span>
              <select
                name="mode"
                defaultValue={settings.mode}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="draft_only">เขียนไว้ให้ตรวจก่อน</option>
                <option value="auto_publish">เขียนแล้วโพสต์ลงเพจอัตโนมัติ</option>
              </select>
              <span className="text-xs leading-5 text-slate-500">
                โหมดโพสต์อัตโนมัติจะสร้าง Preview แล้วส่งเข้าคิวโพสต์ทันทีเมื่อ cron รันถึงเวลา
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-200">ความถี่</span>
                <select
                  name="frequencyDays"
                  defaultValue={String(settings.frequencyDays)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="1">ทุกวัน</option>
                  <option value="2">ทุก 2 วัน</option>
                  <option value="3">ทุก 3 วัน</option>
                  <option value="7">ทุก 7 วัน</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-200">เวลาโพสต์/เขียน</span>
                <input
                  type="time"
                  name="postTime"
                  defaultValue={settings.postTime}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
                <span className="text-xs text-slate-500">ใช้เวลาไทย Asia/Bangkok</span>
              </label>
            </div>

            <SubmitButton
              pendingText="กำลังบันทึก Auto Pilot..."
              className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              บันทึก Auto Pilot
            </SubmitButton>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">สถานะล่าสุด</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div>
                <div className="text-slate-500">สถานะ</div>
                <div className={settings.isEnabled ? "text-emerald-100" : "text-slate-200"}>
                  {settings.isEnabled ? "เปิดใช้งาน" : "ปิดอยู่"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">รอบถัดไป</div>
                <div>{formatDate(settings.nextRunAt)}</div>
              </div>
              <div>
                <div className="text-slate-500">รันล่าสุด</div>
                <div>{formatDate(settings.lastRunAt)}</div>
              </div>
              <div>
                <div className="text-slate-500">ผลลัพธ์ล่าสุด</div>
                <div className="whitespace-pre-wrap">{settings.lastResult || "-"}</div>
              </div>
              {diagnosticCategory ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">
                  <div className="font-semibold">{diagnosticCategory.title}</div>
                  <div className="mt-1 text-xs leading-5 text-amber-100/85">
                    {diagnosticCategory.description}
                  </div>
                </div>
              ) : null}
              {settings.lastErrorMessage ? (
                <div>
                  <div className="text-slate-500">Error ล่าสุด</div>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
                    {settings.lastErrorMessage}
                  </pre>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Diagnostics Checklist</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className={`rounded-xl border p-4 ${statusBadgeClass(topicCounts.active > 0)}`}>
                <div className="font-semibold">Topic Queue</div>
                <div className="mt-1 text-xs leading-5 opacity-80">
                  หัวข้อรอใช้ {topicCounts.active} รายการ
                </div>
              </div>
              <div className={`rounded-xl border p-4 ${statusBadgeClass(hasGeminiApiKey)}`}>
                <div className="font-semibold">Gemini API</div>
                <div className="mt-1 text-xs leading-5 opacity-80">
                  {hasGeminiApiKey
                    ? `พบ GEMINI_API_KEY แล้ว / model=${geminiModel}`
                    : "ยังไม่พบ GEMINI_API_KEY ใน environment"}
                </div>
              </div>
              <div className={`rounded-xl border p-4 ${statusBadgeClass(hasConnectedPage && hasFacebookToken)}`}>
                <div className="font-semibold">Facebook Page</div>
                <div className="mt-1 text-xs leading-5 opacity-80">
                  {hasConnectedPage && hasFacebookToken
                    ? `เชื่อมต่อแล้ว: ${connectedPage?.pageName || connectedPage?.pageId}`
                    : "ยังไม่มี Page ID หรือ Page Access Token ที่ connected"}
                </div>
                <Link
                  href="/dashboard/facebook"
                  className="mt-3 inline-flex text-xs font-semibold underline underline-offset-4"
                >
                  เปิดหน้าตั้งค่า Facebook Page
                </Link>
              </div>
            </div>

            {isAutoPublishMode && !(hasConnectedPage && hasFacebookToken) ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
                คุณเลือกโหมดโพสต์อัตโนมัติ แต่ Facebook Page ยังไม่พร้อม กรุณาเชื่อมต่อเพจก่อนใช้งานจริง
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">โพสต์ล่าสุดจาก Auto Pilot</h2>
            {lastPost ? (
              <div className="mt-5 space-y-3 text-sm text-slate-300">
                <div>
                  <div className="text-slate-500">หัวข้อ</div>
                  <div>{lastPost.topic}</div>
                </div>
                <div>
                  <div className="text-slate-500">สถานะโพสต์</div>
                  <div className={lastPost.status === "error" ? "text-red-100" : "text-slate-100"}>
                    {lastPostStatusLabel}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">เวลาตั้งโพสต์ / เวลาโพสต์จริง</div>
                  <div>
                    {formatDate(lastPost.scheduledAt)} / {formatDate(lastPost.postedAt)}
                  </div>
                </div>
                {lastPost.facebookPostId ? (
                  <div>
                    <div className="text-slate-500">Facebook Post ID</div>
                    <div>{lastPost.facebookPostId}</div>
                  </div>
                ) : null}
                {lastPost.facebookPostUrl ? (
                  <Link
                    href={lastPost.facebookPostUrl}
                    target="_blank"
                    className="inline-flex text-sm font-semibold text-blue-200 underline underline-offset-4 hover:text-blue-100"
                  >
                    เปิดโพสต์บน Facebook
                  </Link>
                ) : null}
                {lastPost.errorMessage ? (
                  <div>
                    <div className="text-slate-500">Error ของโพสต์ล่าสุด</div>
                    <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
                      {lastPost.errorMessage}
                    </pre>
                  </div>
                ) : null}
                <Link
                  href={`/dashboard/posts/${lastPost.id}`}
                  className="inline-flex text-sm font-semibold text-blue-200 underline underline-offset-4 hover:text-blue-100"
                >
                  เปิดโพสต์ในระบบ
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">
                ยังไม่มีโพสต์ล่าสุดจาก Auto Pilot
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <h2 className="text-xl font-semibold text-blue-100">ทดสอบ Auto Pilot ตอนนี้</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100/80">
              ใช้สำหรับทดสอบทันทีโดยไม่ต้องรอ cron ถ้าเลือกโหมดโพสต์อัตโนมัติ ระบบอาจโพสต์ลงเพจจริงทันที
            </p>
            <form action={runAutoPilotNowAction} className="mt-4">
              <SubmitButton
                disabled={topicCounts.active === 0}
                pendingText="กำลังให้ AI เขียนและประมวลผล..."
                className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                รัน Auto Pilot ตอนนี้
              </SubmitButton>
            </form>
            {topicCounts.active === 0 ? (
              <p className="mt-3 text-xs text-blue-100/70">
                ยังไม่มีหัวข้อรอใช้งาน กรุณาเพิ่มหัวข้อใน Topic Queue ก่อน
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
