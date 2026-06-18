import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";
import { ensureDefaultWritingProfile } from "@/lib/workspace";

import { createDraftPostAction } from "./actions";

type NewPostPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "topic_required") {
    return "กรุณาใส่หัวข้ออย่างน้อย 3 ตัวอักษร";
  }

  if (error === "create_failed") {
    return "สร้าง Draft ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }

  if (error === "session_failed") {
    return "ตรวจสอบสถานะการเข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }

  return "";
}

export default async function NewPostPage({ searchParams }: NewPostPageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลดหน้าสร้างโพสต์ไม่สำเร็จ"
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

  let defaultWritingProfile;

  try {
    defaultWritingProfile = await ensureDefaultWritingProfile(
      currentMembership.workspaceId,
    );
  } catch (profileError) {
    return (
      <DashboardLoadError
        title="โหลดสไตล์การเขียนไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(profileError)}
      />
    );
  }

  const params = await searchParams;
  const errorMessage = getErrorMessage(params.error);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Create Post</p>
          <h1 className="mt-2 text-3xl font-bold">สร้าง Draft โพสต์ใหม่</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            ใส่หัวข้อที่อยากให้ AI เขียน และเพิ่มคำสั่งเฉพาะโพสต์นี้ได้ถ้าต้องการ
            รอบนี้ระบบจะบันทึกเป็น Draft ก่อน ยังไม่โพสต์ Facebook จริง
          </p>
        </div>

        <Link
          href="/dashboard/posts"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          ดูรายการโพสต์
        </Link>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <form
          action={createDraftPostAction}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
        >
          <div className="space-y-6">
            {errorMessage ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">
                หัวข้อที่อยากให้ AI เขียน
              </span>
              <input
                name="topic"
                required
                minLength={3}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="เช่น วิธีทำให้ลูกค้าเก่ากลับมาซื้อซ้ำ"
              />
              <span className="text-xs text-slate-500">
                เขียนสั้น ๆ ได้ เดี๋ยวรอบต่อไป AI จะขยายเป็นโพสต์ไม่เกิน {defaultWritingProfile.maxWords} คำ
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-slate-200">
                คำสั่งเฉพาะโพสต์นี้ (ไม่บังคับ)
              </span>
              <textarea
                name="styleOverride"
                rows={6}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="เช่น โพสต์นี้ขอให้เน้นภาษาง่ายมาก ๆ ไม่ขายของ และปิดท้ายด้วยคำชวนคิด"
              />
              <span className="text-xs text-slate-500">
                ถ้าเว้นว่าง ระบบจะใช้สไตล์หลักของคุณจากหน้า Writing Style
              </span>
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <div className="font-semibold text-slate-100">รอบนี้ระบบจะทำอะไร</div>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-400">
                <li>บันทึกหัวข้อเป็น Draft ลง Neon</li>
                <li>ผูก Draft นี้กับสไตล์การเขียนหลักของคุณ</li>
                <li>ยังไม่เรียก Gemini และยังไม่โพสต์ Facebook</li>
              </ul>
            </div>

            <SubmitButton
              pendingText="กำลังบันทึก Draft..."
              className="w-full rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              บันทึกเป็น Draft
            </SubmitButton>
          </div>
        </form>

        <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">สไตล์ที่จะใช้กับโพสต์นี้</h2>
          <p className="mt-2 text-sm text-slate-400">
            ระบบจะใช้สไตล์หลักนี้เป็นฐานตอนให้ Gemini เขียนโพสต์
          </p>

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
              <div className="text-slate-500">กลุ่มเป้าหมาย</div>
              <div>{defaultWritingProfile.targetAudience || "-"}</div>
            </div>
            <div>
              <div className="text-slate-500">กติกา</div>
              <div>{defaultWritingProfile.rules || "-"}</div>
            </div>
            <div>
              <div className="text-slate-500">จำนวนคำสูงสุด</div>
              <div>{defaultWritingProfile.maxWords} คำ</div>
            </div>
          </div>

          <Link
            href="/dashboard/style"
            className="mt-6 inline-flex rounded-xl border border-blue-400/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10"
          >
            แก้สไตล์การเขียน
          </Link>
        </aside>
      </section>
    </div>
  );
}
