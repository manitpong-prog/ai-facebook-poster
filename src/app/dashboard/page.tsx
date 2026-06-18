import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import {
  ensureDefaultWorkspace,
  ensureDefaultWritingProfile,
} from "@/lib/workspace";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentMembership = await ensureDefaultWorkspace(session.user);
  const defaultWritingProfile = await ensureDefaultWritingProfile(
    currentMembership.workspaceId,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          ภาพรวมระบบสร้างโพสต์ Facebook ด้วย AI ตอนนี้ระบบพร้อมสำหรับตั้งค่าสไตล์การเขียนแล้ว
        </p>
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">สร้างโพสต์ใหม่</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ขั้นถัดไปเราจะเพิ่มช่องใส่หัวข้อ ปุ่มให้ AI เขียน และหน้า Preview ก่อนโพสต์จริง
          </p>

          <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-5 text-slate-300">
            Coming soon: Create Post + AI Preview
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
