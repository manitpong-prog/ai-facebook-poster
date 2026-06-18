import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { posts, writingProfiles } from "@/db/schema";
import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

type PostDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
  searchParams: Promise<{
    created?: string;
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
          <h1 className="mt-4 text-3xl font-bold">รายละเอียด Draft</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            ตรวจหัวข้อและสไตล์ก่อน ขั้นถัดไปจะเพิ่มปุ่มให้ AI เขียนโพสต์จาก Draft นี้
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 px-3 py-1">
              {statusLabels[post.status] ?? post.status}
            </span>
            <span className="rounded-full border border-slate-700 px-3 py-1">
              Mode: {post.publishMode}
            </span>
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

          <div className="mt-6">
            <div className="text-sm text-slate-500">ข้อความที่ AI เขียน</div>
            <div className="mt-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 text-sm text-slate-400">
              {post.generatedText ||
                "ยังไม่ได้สร้างข้อความ รอบถัดไปจะเพิ่มปุ่ม Generate with AI"}
            </div>
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
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Writing Style</h2>
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
                <div className="text-slate-500">จำนวนคำสูงสุด</div>
                <div>{post.writingProfileMaxWords ?? 300} คำ</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
