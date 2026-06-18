import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

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
            ดู Draft และโพสต์ที่ Gemini เขียนแล้วของ Workspace นี้
            ก่อนนำไปโพสต์จริงในขั้นถัดไป
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
          ลบ Draft เรียบร้อยแล้ว
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
              <Link
                key={post.id}
                href={`/dashboard/posts/${post.id}`}
                className="block p-5 transition hover:bg-slate-800/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-100">
                      {post.topic}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-slate-700 px-3 py-1">
                        {statusLabels[post.status] ?? post.status}
                      </span>
                      <span className="rounded-full border border-slate-700 px-3 py-1">
                        Mode: {post.publishMode}
                      </span>
                    </div>
                  </div>

                  <div className="text-left text-xs text-slate-500 sm:text-right">
                    <div>สร้าง: {formatDate(post.createdAt)}</div>
                    <div>อัปเดต: {formatDate(post.updatedAt)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
