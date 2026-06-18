import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";
import { ensureDefaultWritingProfile } from "@/lib/workspace";

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

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          ภาพรวมระบบสร้างโพสต์ Facebook ด้วย AI ตอนนี้สามารถตั้งค่าสไตล์การเขียนและสร้าง Draft โพสต์ใหม่ได้แล้ว
        </p>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">สร้างโพสต์ใหม่</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ใส่หัวข้อและคำสั่งเฉพาะโพสต์นี้ แล้วบันทึกเป็น Draft เพื่อเตรียมให้ AI เขียนในขั้นถัดไป
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/posts/new"
              className="rounded-xl bg-blue-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-400"
            >
              + สร้าง Draft ใหม่
            </Link>
            <Link
              href="/dashboard/posts"
              className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-200 hover:border-slate-500"
            >
              ดูรายการโพสต์
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">สไตล์การเขียนเริ่มต้น</h2>
              <p className="mt-2 text-sm text-slate-400">
                AI จะใช้ค่านี้เป็นแนวทางตอนสร้างโพสต์
              </p>
            </div>

            <Link
              href="/dashboard/style"
              className="rounded-xl border border-blue-400/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10"
            >
              แก้ไข
            </Link>
          </div>

          <div className="mt-5 space-y-4 text-sm text-slate-300">
            <div>
              <div className="text-slate-500">ชื่อสไตล์</div>
              <div>{defaultWritingProfile.name}</div>
            </div>

            <div>
              <div className="text-slate-500">โทนภาษา</div>
              <div>{defaultWritingProfile.tone}</div>
            </div>

            <div>
              <div className="text-slate-500">กติกา</div>
              <div>{defaultWritingProfile.rules}</div>
            </div>

            <div>
              <div className="text-slate-500">จำนวนคำสูงสุด</div>
              <div>{defaultWritingProfile.maxWords} คำ</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
