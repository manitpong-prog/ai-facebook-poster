import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/db";
import { facebookPages, posts, writingProfiles } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

import {
  cancelScheduledPostAction,
  deleteDraftPostAction,
  generatePostWithGeminiAction,
  publishGeneratedPostNowAction,
  scheduleGeneratedPostAction,
  updateGeneratedTextAction,
} from "./actions";

type PostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams: Promise<{
    created?: string;
    generated?: string;
    generateError?: string;
    updated?: string;
    updateError?: string;
    deleteError?: string;
    published?: string;
    publishError?: string;
    scheduled?: string;
    scheduleCancelled?: string;
    scheduleError?: string;
    facebookPostId?: string;
    facebookPostUrl?: string;
    message?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  generated: "AI เขียนแล้ว",
  scheduled: "ตั้งเวลาแล้ว",
  posting: "กำลังโพสต์",
  posted: "โพสต์แล้ว",
  cancelled: "ยกเลิก",
  error: "มีปัญหา",
};

const generateErrorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วกดอีกครั้ง",
  gemini_failed:
    "Gemini สร้างโพสต์ไม่สำเร็จ กรุณาเช็ก AI Settings, อินเทอร์เน็ต หรือ quota แล้วลองใหม่",
};

const updateErrorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วกดอีกครั้ง",
  content_required: "กรุณาใส่ข้อความ Preview อย่างน้อย 10 ตัวอักษร",
  save_failed: "บันทึก Preview ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  not_allowed: "โพสต์นี้เผยแพร่แล้วหรือกำลังโพสต์อยู่ จึงแก้ Preview ไม่ได้",
};

const deleteErrorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วกดอีกครั้ง",
  not_allowed:
    "โพสต์นี้กำลังถูกส่งไป Facebook อยู่ กรุณารอสักครู่แล้วโหลดหน้าใหม่ก่อนลบ",
  delete_failed: "ลบโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
};

const publishErrorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วกดอีกครั้ง",
  content_required:
    "ยังไม่มี Preview สำหรับโพสต์ กรุณาให้ Gemini เขียนหรือบันทึกข้อความก่อน",
  facebook_not_connected:
    "ยังไม่ได้เชื่อม Facebook Page หรือยังไม่มี Page Access Token กรุณาไปตั้งค่า Facebook Page ก่อน",
  already_posting:
    "โพสต์นี้กำลังถูกส่งไป Facebook อยู่ กรุณารอสักครู่แล้วโหลดหน้าใหม่",
  already_posted:
    "โพสต์นี้ถูกเผยแพร่ไป Facebook แล้ว ระบบไม่โพสต์ซ้ำให้อัตโนมัติ",
  facebook_failed:
    "โพสต์ไป Facebook ไม่สำเร็จ กรุณาเช็ก Page Access Token, permission หรือสถานะ Meta App แล้วลองใหม่",
};

const scheduleErrorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วกดอีกครั้ง",
  content_required:
    "ยังไม่มี Preview สำหรับตั้งเวลา กรุณาให้ Gemini เขียนหรือบันทึกข้อความก่อน",
  facebook_not_connected:
    "ยังไม่ได้เชื่อม Facebook Page หรือยังไม่มี Page Access Token กรุณาไปตั้งค่า Facebook Page ก่อน",
  invalid_datetime: "รูปแบบวันเวลาไม่ถูกต้อง กรุณาเลือกวันและเวลาใหม่",
  future_required: "กรุณาเลือกเวลาหลังจากเวลาปัจจุบันอย่างน้อย 1 นาที",
  already_posting:
    "โพสต์นี้กำลังถูกส่งไป Facebook อยู่ กรุณารอสักครู่แล้วโหลดหน้าใหม่",
  already_posted: "โพสต์นี้ถูกเผยแพร่ไป Facebook แล้ว จึงตั้งเวลาไม่ได้",
  not_scheduled: "โพสต์นี้ยังไม่ได้อยู่ในสถานะตั้งเวลา",
  schedule_failed: "บันทึกเวลาตั้งโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  cancel_failed: "ยกเลิกเวลาตั้งโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
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

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60_000);
}

function formatDateTimeLocalBangkok(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Bangkok",
  }).formatToParts(value);

  const getPart = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}T${getPart("hour")}:${getPart("minute")}`;
}

function countApproxWords(text: string | null) {
  if (!text?.trim()) {
    return 0;
  }

  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default async function PostDetailPage({
  params,
  searchParams,
}: PostDetailPageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลดรายละเอียดโพสต์ไม่สำเร็จ"
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

  const { postId } = await params;
  const query = await searchParams;

  let post;
  let facebookPage: Pick<
    typeof facebookPages.$inferSelect,
    "id" | "pageName" | "pageId" | "accessTokenEncrypted" | "status"
  > | null = null;

  try {
    [post] = await db
      .select({
        id: posts.id,
        topic: posts.topic,
        styleOverride: posts.styleOverride,
        generatedText: posts.generatedText,
        status: posts.status,
        publishMode: posts.publishMode,
        scheduledAt: posts.scheduledAt,
        postedAt: posts.postedAt,
        facebookPostId: posts.facebookPostId,
        facebookPostUrl: posts.facebookPostUrl,
        errorMessage: posts.errorMessage,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        writingProfileName: writingProfiles.name,
        writingProfileTone: writingProfiles.tone,
        writingProfileRules: writingProfiles.rules,
        writingProfileCallToAction: writingProfiles.callToAction,
        writingProfileMaxWords: writingProfiles.maxWords,
      })
      .from(posts)
      .leftJoin(writingProfiles, eq(posts.writingProfileId, writingProfiles.id))
      .where(
        and(
          eq(posts.id, postId),
          eq(posts.workspaceId, currentMembership.workspaceId),
        ),
      )
      .limit(1);

    const [selectedFacebookPage] = await db
      .select({
        id: facebookPages.id,
        pageName: facebookPages.pageName,
        pageId: facebookPages.pageId,
        accessTokenEncrypted: facebookPages.accessTokenEncrypted,
        status: facebookPages.status,
      })
      .from(facebookPages)
      .where(eq(facebookPages.workspaceId, currentMembership.workspaceId))
      .limit(1);

    facebookPage = selectedFacebookPage ?? null;
  } catch (postError) {
    return (
      <DashboardLoadError
        title="โหลดรายละเอียดโพสต์ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(postError)}
      />
    );
  }

  if (!post) {
    notFound();
  }

  const approxWordCount = countApproxWords(post.generatedText);
  const canDeletePost = post.status !== "posting";
  const hasConnectedFacebookPage = Boolean(
    facebookPage?.pageId && facebookPage.accessTokenEncrypted,
  );
  const canPublishNow = Boolean(
    post.generatedText &&
    hasConnectedFacebookPage &&
    post.status !== "posted" &&
    post.status !== "posting",
  );
  const canSchedulePost = Boolean(
    post.generatedText &&
    hasConnectedFacebookPage &&
    post.status !== "posted" &&
    post.status !== "posting",
  );
  const canCancelScheduledPost = post.status === "scheduled";
  const minScheduleDate = addMinutes(new Date(), 1);
  const defaultScheduleDate = post.scheduledAt ?? addMinutes(new Date(), 60);
  const minScheduleInput = formatDateTimeLocalBangkok(minScheduleDate);
  const defaultScheduleInput = formatDateTimeLocalBangkok(defaultScheduleDate);
  const publishedUrl = query.facebookPostUrl || post.facebookPostUrl;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/dashboard/posts"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← กลับรายการโพสต์
          </Link>
          <h1 className="mt-4 text-3xl font-bold">รายละเอียดโพสต์</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            ตรวจหัวข้อ ให้ Gemini เขียนโพสต์ แก้ Preview แล้วค่อยนำไปใช้จริง
          </p>
        </div>

        <Link
          href="/dashboard/posts/new"
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
        >
          + สร้างใหม่
        </Link>
      </div>

      {query.created === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          บันทึก Draft เรียบร้อยแล้ว
        </div>
      ) : null}

      {query.generated === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          Gemini เขียนโพสต์และบันทึก Preview เรียบร้อยแล้ว
        </div>
      ) : null}

      {query.updated === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          บันทึก Preview ที่แก้ไขแล้วเรียบร้อย
        </div>
      ) : null}

      {query.published === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <div>โพสต์ Preview ไปยัง Facebook Page สำเร็จแล้ว</div>
          {query.facebookPostId || post.facebookPostId ? (
            <div className="mt-2 text-xs text-emerald-100/80">
              Facebook Post ID: {query.facebookPostId || post.facebookPostId}
            </div>
          ) : null}
          {publishedUrl ? (
            <a
              href={publishedUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-emerald-100 underline underline-offset-4"
            >
              เปิดโพสต์บน Facebook
            </a>
          ) : null}
        </div>
      ) : null}

      {query.scheduled === "1" ? (
        <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          บันทึกเวลาตั้งโพสต์เรียบร้อยแล้ว ขั้นนี้เป็นการบันทึกคิวไว้ก่อน ระบบ
          Cron สำหรับโพสต์อัตโนมัติจะทำในขั้นถัดไป
        </div>
      ) : null}

      {query.scheduleCancelled === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          ยกเลิกเวลาตั้งโพสต์เรียบร้อยแล้ว
        </div>
      ) : null}

      {query.generateError ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <div>
            {generateErrorLabels[query.generateError] ??
              "สร้างโพสต์ด้วย Gemini ไม่สำเร็จ กรุณาลองใหม่"}
          </div>
          {query.message || post.errorMessage ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-red-950/50 p-3 text-xs leading-5 text-red-100/90">
              {query.message || post.errorMessage}
            </pre>
          ) : null}
        </div>
      ) : null}

      {query.updateError ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {updateErrorLabels[query.updateError] ??
            "บันทึก Preview ไม่สำเร็จ กรุณาลองใหม่"}
        </div>
      ) : null}

      {query.deleteError ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {deleteErrorLabels[query.deleteError] ??
            "ลบ Draft ไม่สำเร็จ กรุณาลองใหม่"}
        </div>
      ) : null}

      {query.publishError ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <div>
            {publishErrorLabels[query.publishError] ??
              "โพสต์ไป Facebook ไม่สำเร็จ กรุณาลองใหม่"}
          </div>
          {query.message || post.errorMessage ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-red-950/50 p-3 text-xs leading-5 text-red-100/90">
              {query.message || post.errorMessage}
            </pre>
          ) : null}
        </div>
      ) : null}

      {query.scheduleError ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {scheduleErrorLabels[query.scheduleError] ??
            "ตั้งเวลาโพสต์ไม่สำเร็จ กรุณาลองใหม่"}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 px-3 py-1">
              {statusLabels[post.status] ?? post.status}
            </span>
            <span className="rounded-full border border-slate-700 px-3 py-1">
              Mode: {post.publishMode}
            </span>
            {post.scheduledAt ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-100">
                ตั้งเวลา: {formatDate(post.scheduledAt)}
              </span>
            ) : null}
          </div>

          <div className="mt-6">
            <div className="text-sm text-slate-500">หัวข้อ</div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              {post.topic}
            </h2>
          </div>

          <div className="mt-6">
            <div className="text-sm text-slate-500">คำสั่งเฉพาะโพสต์นี้</div>
            <div className="mt-2 whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
              {post.styleOverride || "ไม่ได้ระบุ ระบบจะใช้สไตล์หลักอย่างเดียว"}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
            <h2 className="text-lg font-semibold text-blue-100">
              Generate with Gemini
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100/80">
              ระบบจะใช้หัวข้อ + Writing Style ด้านขวา
              เพื่อเขียนโพสต์ภาษาไทยไม่เกิน {post.writingProfileMaxWords ?? 300}{" "}
              คำ
            </p>

            <form action={generatePostWithGeminiAction} className="mt-4">
              <input type="hidden" name="postId" value={post.id} />
              <SubmitButton
                pendingText="Gemini กำลังเขียน..."
                className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {post.generatedText
                  ? "ให้ Gemini เขียนใหม่"
                  : "ให้ Gemini เขียนโพสต์"}
              </SubmitButton>
            </form>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Preview ข้อความที่ AI เขียน
              </div>
              {post.generatedText ? (
                <div className="text-xs text-slate-500">
                  ประมาณ {approxWordCount} คำ
                </div>
              ) : null}
            </div>

            {post.generatedText ? (
              <form
                action={updateGeneratedTextAction}
                className="mt-2 space-y-4"
              >
                <input type="hidden" name="postId" value={post.id} />
                <textarea
                  name="generatedText"
                  defaultValue={post.generatedText}
                  rows={14}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-5 text-sm leading-7 text-slate-100 outline-none transition focus:border-blue-500"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-slate-500">
                    แก้ข้อความตรงนี้ได้เลย เช่น ตัดคำ เพิ่ม CTA หรือปรับภาษา
                    แล้วกดบันทึกก่อนนำไปโพสต์จริง
                  </p>
                  <SubmitButton
                    pendingText="กำลังบันทึก Preview..."
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    บันทึก Preview
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <div className="mt-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm text-slate-400">
                ยังไม่ได้สร้างข้อความ กดปุ่ม “ให้ Gemini เขียนโพสต์” เพื่อสร้าง
                Preview
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <h2 className="text-lg font-semibold text-emerald-100">
              Publish Now to Facebook
            </h2>
            <p className="mt-2 text-sm leading-6 text-emerald-100/80">
              ใช้ข้อความ Preview ล่าสุดที่บันทึกไว้ แล้วโพสต์จริงไปยัง Facebook
              Page ที่เชื่อมต่อไว้
            </p>

            {facebookPage?.pageName ? (
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-slate-950/60 p-3 text-xs leading-5 text-emerald-100/80">
                เพจปลายทาง: {facebookPage.pageName}
              </div>
            ) : null}

            <form action={publishGeneratedPostNowAction} className="mt-4">
              <input type="hidden" name="postId" value={post.id} />
              <SubmitButton
                disabled={!canPublishNow}
                pendingText="กำลังโพสต์ไป Facebook..."
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                โพสต์ Preview นี้ไป Facebook Page
              </SubmitButton>
            </form>

            {!post.generatedText ? (
              <p className="mt-3 text-xs leading-5 text-emerald-100/70">
                ต้องให้ Gemini เขียนหรือบันทึก Preview ก่อนจึงจะโพสต์จริงได้
              </p>
            ) : null}
            {post.generatedText && !hasConnectedFacebookPage ? (
              <p className="mt-3 text-xs leading-5 text-emerald-100/70">
                ต้องเชื่อม Facebook Page ก่อนที่หน้า{" "}
                <Link
                  href="/dashboard/facebook"
                  className="underline underline-offset-4"
                >
                  ตั้งค่าเพจ Facebook
                </Link>
              </p>
            ) : null}
            {post.status === "posted" ? (
              <p className="mt-3 text-xs leading-5 text-emerald-100/70">
                โพสต์นี้เผยแพร่ไป Facebook แล้ว ระบบจึงปิดปุ่มโพสต์ซ้ำเพื่อกัน
                duplicate
              </p>
            ) : null}
            {post.status === "posting" ? (
              <p className="mt-3 text-xs leading-5 text-emerald-100/70">
                โพสต์นี้กำลังถูกส่งไป Facebook กรุณารอสักครู่แล้วโหลดหน้าใหม่
              </p>
            ) : null}
            {post.generatedText && canPublishNow ? (
              <p className="mt-3 text-xs leading-5 text-emerald-100/70">
                ถ้าแก้ข้อความใน Preview แล้ว ต้องกด “บันทึก Preview”
                ก่อนกดโพสต์จริง
              </p>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="text-lg font-semibold text-amber-100">
              Schedule Post
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-100/80">
              เลือกวันและเวลาที่ต้องการโพสต์ โดยใช้เวลาไทย (Asia/Bangkok)
              ขั้นนี้จะบันทึกคิวไว้ก่อน และจะต่อระบบ Cron ให้โพสต์อัตโนมัติใน
              Step 21.2
            </p>

            {post.scheduledAt ? (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-slate-950/60 p-3 text-xs leading-5 text-amber-100/80">
                ตั้งเวลาไว้แล้ว: {formatDate(post.scheduledAt)}
              </div>
            ) : null}

            <form
              action={scheduleGeneratedPostAction}
              className="mt-4 space-y-4"
            >
              <input type="hidden" name="postId" value={post.id} />
              <div>
                <label
                  htmlFor="scheduledAtLocal"
                  className="text-sm font-medium text-amber-100"
                >
                  วันและเวลาที่จะโพสต์
                </label>
                <input
                  id="scheduledAtLocal"
                  name="scheduledAtLocal"
                  type="datetime-local"
                  min={minScheduleInput}
                  defaultValue={defaultScheduleInput}
                  disabled={!canSchedulePost}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <SubmitButton
                disabled={!canSchedulePost}
                pendingText="กำลังบันทึกเวลาตั้งโพสต์..."
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                บันทึกเวลาตั้งโพสต์
              </SubmitButton>
            </form>

            {canCancelScheduledPost ? (
              <form action={cancelScheduledPostAction} className="mt-3">
                <input type="hidden" name="postId" value={post.id} />
                <SubmitButton
                  pendingText="กำลังยกเลิก..."
                  className="rounded-xl border border-amber-300/60 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ยกเลิกเวลาตั้งโพสต์
                </SubmitButton>
              </form>
            ) : null}

            {!post.generatedText ? (
              <p className="mt-3 text-xs leading-5 text-amber-100/70">
                ต้องให้ Gemini เขียนหรือบันทึก Preview ก่อนจึงจะตั้งเวลาได้
              </p>
            ) : null}
            {post.generatedText && !hasConnectedFacebookPage ? (
              <p className="mt-3 text-xs leading-5 text-amber-100/70">
                ต้องเชื่อม Facebook Page ก่อนจึงจะตั้งเวลาได้
              </p>
            ) : null}
            {post.status === "posted" ? (
              <p className="mt-3 text-xs leading-5 text-amber-100/70">
                โพสต์นี้เผยแพร่ไปแล้ว จึงตั้งเวลาใหม่ไม่ได้
              </p>
            ) : null}
            {post.generatedText && canSchedulePost ? (
              <p className="mt-3 text-xs leading-5 text-amber-100/70">
                ถ้าแก้ข้อความใน Preview แล้ว ต้องกด “บันทึก Preview”
                ก่อนบันทึกเวลาตั้งโพสต์
              </p>
            ) : null}
          </div>
        </article>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">ข้อมูลโพสต์</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div>
                <div className="text-slate-500">สร้างเมื่อ</div>
                <div>{formatDate(post.createdAt)}</div>
              </div>
              <div>
                <div className="text-slate-500">อัปเดตล่าสุด</div>
                <div>{formatDate(post.updatedAt)}</div>
              </div>
              <div>
                <div className="text-slate-500">ตั้งเวลาโพสต์</div>
                <div>{formatDate(post.scheduledAt)}</div>
              </div>
              <div>
                <div className="text-slate-500">โพสต์เมื่อ</div>
                <div>{formatDate(post.postedAt)}</div>
              </div>
              <div>
                <div className="text-slate-500">Facebook Post ID</div>
                <div className="break-all font-mono text-xs">
                  {post.facebookPostId || "-"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Facebook URL</div>
                {post.facebookPostUrl ? (
                  <a
                    href={post.facebookPostUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-blue-300 hover:text-blue-200"
                  >
                    เปิดโพสต์
                  </a>
                ) : (
                  <div>-</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Writing Style</h2>
              <Link
                href="/dashboard/style"
                className="text-sm text-blue-300 hover:text-blue-200"
              >
                แก้ไข
              </Link>
            </div>
            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div>
                <div className="text-slate-500">ชื่อสไตล์</div>
                <div>{post.writingProfileName || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">โทนภาษา</div>
                <div>{post.writingProfileTone || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">กติกา</div>
                <div>{post.writingProfileRules || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">แนวทาง CTA</div>
                <div className="whitespace-pre-wrap">
                  {post.writingProfileCallToAction || "-"}
                </div>
              </div>
              <div>
                <div className="text-slate-500">จำนวนคำสูงสุด</div>
                <div>{post.writingProfileMaxWords ?? 300} คำ</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="text-xl font-semibold text-red-100">
              ลบโพสต์จากระบบ
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-100/75">
              ใช้ลบรายการที่บันทึกซ้ำหรือไม่ต้องการแล้ว ถ้าโพสต์เคยเผยแพร่บน
              Facebook แล้ว การลบตรงนี้จะลบเฉพาะข้อมูลในระบบ ไม่ลบโพสต์บน
              Facebook
            </p>
            <form action={deleteDraftPostAction} className="mt-4">
              <input type="hidden" name="postId" value={post.id} />
              <SubmitButton
                disabled={!canDeletePost}
                pendingText="กำลังลบ..."
                className="rounded-xl border border-red-400/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ลบโพสต์นี้
              </SubmitButton>
            </form>
            {!canDeletePost ? (
              <p className="mt-3 text-xs text-red-100/60">
                โพสต์นี้กำลังถูกส่งไป Facebook อยู่ จึงยังลบไม่ได้
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
