import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

import { deletePostFromListAction } from "./actions";

type PostsPageProps = {
  searchParams?: Promise<{
    deleted?: string;
    error?: string;
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

const errorLabels: Record<string, string> = {
  post_not_found: "ไม่พบโพสต์ หรือโพสต์นี้ไม่ได้อยู่ใน Workspace ของคุณ",
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วกดอีกครั้ง",
  delete_failed: "ลบโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
  posting_delete_blocked:
    "โพสต์นี้กำลังถูกส่งไป Facebook อยู่ กรุณารอสักครู่แล้วโหลดหน้าใหม่ก่อนลบ",
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

export default async function PostsPage({ searchParams }: PostsPageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลดรายการโพสต์ไม่สำเร็จ"
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

  let workspacePosts;

  try {
    workspacePosts = await db
      .select({
        id: posts.id,
        topic: posts.topic,
        status: posts.status,
        publishMode: posts.publishMode,
        scheduledAt: posts.scheduledAt,
        postedAt: posts.postedAt,
        facebookPostUrl: posts.facebookPostUrl,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(eq(posts.workspaceId, currentMembership.workspaceId))
      .orderBy(desc(posts.createdAt))
      .limit(50);
  } catch (postsError) {
    return (
      <DashboardLoadError
        title="โหลดรายการโพสต์ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(postsError)}
      />
    );
  }

  const params = await searchParams;
  const wasDeleted = params?.deleted === "1";
  const errorMessage = params?.error ? errorLabels[params.error] : "";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Posts</p>
          <h1 className="mt-2 text-3xl font-bold">รายการโพสต์</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            ดู Draft โพสต์ที่ Gemini เขียนแล้ว โพสต์ที่ตั้งเวลาไว้
            และโพสต์ที่เผยแพร่ไปยัง Facebook Page แล้ว
          </p>
        </div>

        <Link
          href="/dashboard/posts/new"
          className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
        >
          + สร้างโพสต์ใหม่
        </Link>
      </div>

      {wasDeleted ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          ลบรายการโพสต์จากระบบเรียบร้อยแล้ว
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900">
        {workspacePosts.length === 0 ? (
          <div className="p-8 text-center">
            <h2 className="text-xl font-semibold">ยังไม่มีโพสต์</h2>
            <p className="mt-2 text-sm text-slate-400">
              เริ่มจากสร้าง Draft แรก แล้วกดให้ Gemini เขียน Preview ต่อได้
            </p>
            <Link
              href="/dashboard/posts/new"
              className="mt-6 inline-flex rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400"
            >
              สร้าง Draft แรก
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {workspacePosts.map((post) => (
              <div
                key={post.id}
                className="block p-5 transition hover:bg-slate-800/50"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/dashboard/posts/${post.id}`}
                      className="font-semibold text-slate-100 underline-offset-4 hover:text-blue-200 hover:underline"
                    >
                      {post.topic}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
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
                      {post.facebookPostUrl ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-emerald-100">
                          มีลิงก์ Facebook แล้ว
                        </span>
                      ) : null}
                    </div>
                    {post.status === "posted" ? (
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        ลบจากระบบจะไม่ลบโพสต์ที่เผยแพร่บน Facebook แล้ว
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 text-left text-xs text-slate-500 sm:items-end sm:text-right">
                    <div>
                      <div>สร้าง: {formatDate(post.createdAt)}</div>
                      <div>อัปเดต: {formatDate(post.updatedAt)}</div>
                      {post.scheduledAt ? (
                        <div>ตั้งเวลา: {formatDate(post.scheduledAt)}</div>
                      ) : null}
                      {post.postedAt ? (
                        <div>โพสต์: {formatDate(post.postedAt)}</div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Link
                        href={`/dashboard/posts/${post.id}`}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:bg-slate-800"
                      >
                        เปิดดู
                      </Link>
                      <form action={deletePostFromListAction}>
                        <input type="hidden" name="postId" value={post.id} />
                        <SubmitButton
                          disabled={post.status === "posting"}
                          pendingText="กำลังลบ..."
                          className="rounded-xl border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ลบ
                        </SubmitButton>
                      </form>
                    </div>
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
