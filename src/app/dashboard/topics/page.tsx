import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/db";
import { contentTopics } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

import {
  autoWriteNextTopicAction,
  createDraftFromTopicAction,
  createTopicsAction,
  updateTopicStatusAction,
} from "./actions";

type TopicsPageProps = {
  searchParams?: Promise<{
    created?: string;
    updated?: string;
    error?: string;
  }>;
};

type TopicStatus = "active" | "paused" | "used" | "archived";

const statusLabels: Record<TopicStatus, string> = {
  active: "รอใช้",
  paused: "พักไว้ก่อน",
  used: "ใช้แล้ว",
  archived: "เก็บถาวร",
};

const errorLabels: Record<string, string> = {
  topic_required: "กรุณาใส่หัวข้ออย่างน้อย 1 หัวข้อ และแต่ละหัวข้อต้องยาวอย่างน้อย 3 ตัวอักษร",
  create_failed: "บันทึกหัวข้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วทำอีกครั้ง",
  workspace_missing: "ไม่พบ Workspace สำหรับบันทึกหัวข้อ",
  invalid_status: "สถานะหัวข้อไม่ถูกต้อง",
  topic_not_found: "ไม่พบหัวข้อนี้ หรือหัวข้อนี้ไม่ได้อยู่ใน Workspace ของคุณ",
  topic_already_used: "หัวข้อนี้ถูกใช้สร้าง Draft แล้ว จึงแก้สถานะไม่ได้",
  topic_archived: "หัวข้อนี้ถูกเก็บถาวรแล้ว กรุณาเปิดใช้งานก่อนสร้าง Draft",
  status_failed: "อัปเดตสถานะหัวข้อไม่สำเร็จ",
  draft_failed: "สร้าง Draft จากหัวข้อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  no_active_topic: "ยังไม่มีหัวข้อสถานะรอใช้สำหรับให้ AI เขียน กรุณาเพิ่มหัวข้อใหม่หรือเปิดใช้งานหัวข้อที่พักไว้ก่อน",
  auto_write_failed: "AI เขียนโพสต์จากหัวข้อถัดไปไม่สำเร็จ กรุณาเช็ก GEMINI_API_KEY, quota หรือโมเดล แล้วลองใหม่",
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

function getStatusClass(status: TopicStatus) {
  if (status === "active") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "paused") {
    return "border-amber-500/40 bg-amber-500/10 text-amber-100";
  }

  if (status === "used") {
    return "border-blue-500/40 bg-blue-500/10 text-blue-100";
  }

  return "border-slate-700 bg-slate-950 text-slate-300";
}

export default async function TopicsPage({ searchParams }: TopicsPageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลด Topic Queue ไม่สำเร็จ"
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

  let topics;

  try {
    topics = await db
      .select({
        id: contentTopics.id,
        title: contentTopics.title,
        notes: contentTopics.notes,
        status: contentTopics.status,
        priority: contentTopics.priority,
        usedAt: contentTopics.usedAt,
        createdPostId: contentTopics.createdPostId,
        createdAt: contentTopics.createdAt,
        updatedAt: contentTopics.updatedAt,
      })
      .from(contentTopics)
      .where(eq(contentTopics.workspaceId, currentMembership.workspaceId))
      .orderBy(asc(contentTopics.priority), asc(contentTopics.createdAt))
      .limit(100);
  } catch (topicsError) {
    return (
      <DashboardLoadError
        title="โหลด Topic Queue ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(topicsError)}
      />
    );
  }

  const query = await searchParams;
  const createdCount = query?.created ? Number(query.created) : 0;
  const errorMessage = query?.error ? errorLabels[query.error] : "";

  const counts = topics.reduce(
    (acc, topic) => {
      acc[topic.status] += 1;
      return acc;
    },
    {
      active: 0,
      paused: 0,
      used: 0,
      archived: 0,
    } satisfies Record<TopicStatus, number>,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Topic Queue</p>
          <h1 className="mt-2 text-3xl font-bold">คลังหัวข้อสำหรับ AI</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            ใส่หัวข้อไว้หลาย ๆ หัวข้อ แล้วให้ AI เลือกหัวข้อถัดไปมาเขียนเป็นโพสต์ให้ทันที
            ขั้นนี้เป็นฐานของระบบ Auto Content Queue ก่อนต่อเข้ากับ Cron
          </p>
        </div>

        <Link
          href="/dashboard/posts"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          ดูรายการโพสต์
        </Link>
      </div>

      {createdCount > 0 ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          เพิ่มหัวข้อใหม่ {createdCount} หัวข้อเรียบร้อยแล้ว
        </div>
      ) : null}

      {query?.updated === "1" ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          อัปเดตสถานะหัวข้อเรียบร้อยแล้ว
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
        <form
          action={createTopicsAction}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <h2 className="text-xl font-semibold">เพิ่มหัวข้อหลายรายการ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ใส่ 1 หัวข้อต่อ 1 บรรทัด ระบบจะบันทึกเป็นคิวรอให้ AI นำไปเขียนในอนาคต
          </p>

          <div className="mt-6 space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">
                หัวข้อที่อยากให้ AI เขียน
              </span>
              <textarea
                name="topicsText"
                required
                rows={9}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder={[
                  "วิธีเลือกสติกเกอร์ไลน์ให้เข้ากับแบรนด์",
                  "ทำไมร้านค้าควรมีสติกเกอร์ไลน์ของตัวเอง",
                  "ไอเดียใช้สติกเกอร์ไลน์เพิ่มยอดขายแบบไม่ขายตรงเกินไป",
                ].join("\n")}
              />
              <span className="text-xs text-slate-500">
                ระบบจะตัดหัวข้อซ้ำในชุดที่วางมาให้อัตโนมัติ
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">
                หมายเหตุร่วมสำหรับหัวข้อชุดนี้ (ไม่บังคับ)
              </span>
              <textarea
                name="notes"
                rows={4}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="เช่น ชุดนี้ให้เขียนแนวให้ความรู้สำหรับเจ้าของร้าน ไม่ขายของแรง และปิดท้ายชวนทักแชต"
              />
            </label>

            <SubmitButton
              pendingText="กำลังบันทึกหัวข้อ..."
              className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              เพิ่มเข้าคลังหัวข้อ
            </SubmitButton>
          </div>
        </form>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">ภาพรวมคลังหัวข้อ</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="text-2xl font-bold text-emerald-100">
                {counts.active}
              </div>
              <div className="mt-1 text-emerald-100/80">รอใช้งาน</div>
            </div>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="text-2xl font-bold text-amber-100">
                {counts.paused}
              </div>
              <div className="mt-1 text-amber-100/80">พักไว้ก่อน</div>
            </div>
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
              <div className="text-2xl font-bold text-blue-100">
                {counts.used}
              </div>
              <div className="mt-1 text-blue-100/80">ใช้แล้ว</div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950 p-4">
              <div className="text-2xl font-bold text-slate-100">
                {counts.archived}
              </div>
              <div className="mt-1 text-slate-400">เก็บถาวร</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100/80">
            <div className="font-semibold text-blue-100">Auto Writer จากหัวข้อถัดไป</div>
            <p className="mt-2">
              กดปุ่มนี้เพื่อให้ระบบเลือกหัวข้อสถานะ “รอใช้” ตามลำดับคิว แล้วให้
              Gemini เขียน Preview ให้ทันที ก่อนต่อยอดไปเป็น Auto Posting
            </p>
            <form action={autoWriteNextTopicAction} className="mt-4">
              <SubmitButton
                disabled={counts.active === 0}
                pendingText="Gemini กำลังเลือกหัวข้อและเขียนโพสต์..."
                className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ให้ AI เขียนจากหัวข้อถัดไป
              </SubmitButton>
            </form>
            {counts.active === 0 ? (
              <p className="mt-3 text-xs text-blue-100/70">
                ยังไม่มีหัวข้อรอใช้งาน กรุณาเพิ่มหัวข้อใหม่หรือเปิดใช้งานหัวข้อที่พักไว้
              </p>
            ) : null}
          </div>
        </aside>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 p-6">
          <h2 className="text-xl font-semibold">รายการหัวข้อ</h2>
          <p className="mt-2 text-sm text-slate-400">
            ตอนนี้สามารถสร้าง Draft ด้วยมือ หรือให้ AI เลือกหัวข้อถัดไปจากคิวไปเขียนให้อัตโนมัติได้แล้ว
          </p>
        </div>

        {topics.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            ยังไม่มีหัวข้อ ลองเพิ่มหัวข้อชุดแรกด้านบนได้เลยครับ
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {topics.map((topic) => (
              <div key={topic.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(topic.status)}`}
                      >
                        {statusLabels[topic.status]}
                      </span>
                      <span className="text-xs text-slate-500">
                        สร้าง: {formatDate(topic.createdAt)}
                      </span>
                      {topic.usedAt ? (
                        <span className="text-xs text-slate-500">
                          ใช้เมื่อ: {formatDate(topic.usedAt)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-100">
                      {topic.title}
                    </h3>
                    {topic.notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">
                        {topic.notes}
                      </p>
                    ) : null}
                    {topic.createdPostId ? (
                      <Link
                        href={`/dashboard/posts/${topic.createdPostId}`}
                        className="mt-3 inline-flex text-sm font-semibold text-blue-200 underline underline-offset-4 hover:text-blue-100"
                      >
                        เปิด Draft ที่สร้างจากหัวข้อนี้
                      </Link>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {topic.status !== "used" && topic.status !== "archived" ? (
                      <form action={createDraftFromTopicAction}>
                        <input type="hidden" name="topicId" value={topic.id} />
                        <SubmitButton
                          pendingText="กำลังสร้าง Draft..."
                          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          สร้าง Draft
                        </SubmitButton>
                      </form>
                    ) : null}

                    {topic.status === "active" ? (
                      <form action={updateTopicStatusAction}>
                        <input type="hidden" name="topicId" value={topic.id} />
                        <input type="hidden" name="status" value="paused" />
                        <SubmitButton
                          pendingText="กำลังพัก..."
                          className="rounded-xl border border-amber-500/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          พักไว้ก่อน
                        </SubmitButton>
                      </form>
                    ) : null}

                    {topic.status === "paused" || topic.status === "archived" ? (
                      <form action={updateTopicStatusAction}>
                        <input type="hidden" name="topicId" value={topic.id} />
                        <input type="hidden" name="status" value="active" />
                        <SubmitButton
                          pendingText="กำลังเปิดใช้..."
                          className="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          เปิดใช้งาน
                        </SubmitButton>
                      </form>
                    ) : null}

                    {topic.status !== "used" && topic.status !== "archived" ? (
                      <form action={updateTopicStatusAction}>
                        <input type="hidden" name="topicId" value={topic.id} />
                        <input type="hidden" name="status" value="archived" />
                        <SubmitButton
                          pendingText="กำลังเก็บ..."
                          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          เก็บถาวร
                        </SubmitButton>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
