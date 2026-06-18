import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { db } from "@/db";
import { writingProfiles } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ensureDefaultWorkspace } from "@/lib/workspace";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentMembership = await ensureDefaultWorkspace(session.user);

  const defaultWritingProfiles = await db
    .select()
    .from(writingProfiles)
    .where(eq(writingProfiles.workspaceId, currentMembership.workspaceId))
    .limit(1);

  const defaultWritingProfile = defaultWritingProfiles[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">
              {currentMembership.workspaceName}
            </p>
            <h1 className="mt-1 text-3xl font-bold">Dashboard</h1>
            <p className="mt-2 text-slate-300">
              สวัสดี {session.user.name} เริ่มสร้างโพสต์ Facebook ด้วย AI ได้จากหน้านี้
            </p>
          </div>

          <SignOutButton />
        </header>

        <section className="grid gap-6 py-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">สร้างโพสต์ใหม่</h2>
            <p className="mt-2 text-sm text-slate-400">
              ขั้นนี้ยังเป็นหน้า Dashboard เริ่มต้น รอบถัดไปเราจะเพิ่มช่องใส่หัวข้อ,
              ปุ่มให้ AI เขียน และหน้า Preview
            </p>

            <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-5 text-slate-300">
              Coming soon: Create Post + AI Preview
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">สไตล์การเขียนเริ่มต้น</h2>

            {defaultWritingProfile ? (
              <div className="mt-4 space-y-4 text-sm text-slate-300">
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
            ) : (
              <p className="mt-4 text-sm text-red-200">
                ไม่พบสไตล์การเขียนเริ่มต้น
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
