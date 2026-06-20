import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { db } from "@/db";
import { facebookPages } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

import { PantipSourceClient } from "./pantip-source-client";

export const dynamic = "force-dynamic";

export default async function PantipSourcePage() {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลดหน้าโพสต์จาก Pantip ไม่สำเร็จ"
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

  const [savedPage] = await db
    .select({
      pageName: facebookPages.pageName,
      pageId: facebookPages.pageId,
      accessTokenEncrypted: facebookPages.accessTokenEncrypted,
    })
    .from(facebookPages)
    .where(eq(facebookPages.workspaceId, currentMembership.workspaceId))
    .limit(1);

  const hasConnectedFacebookPage = Boolean(
    savedPage?.pageId && savedPage.accessTokenEncrypted,
  );
  const facebookPageLabel = savedPage?.pageName || savedPage?.pageId || "ยังไม่ได้เชื่อมต่อ";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-300">Manual Pantip Source Post</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">โพสต์จากลิงก์ Pantip</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          ใส่ลิงก์ Pantip เอง สร้างภาพเฉพาะส่วนบนของกระทู้ ให้ Gemini เขียนสรุปสั้น ๆ แล้วตรวจเองก่อนกดโพสต์ ไม่มีการสุ่มหา ไม่มีการตั้งเวลา และไม่มีการดึงคอมเมนต์
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <div className="font-semibold">Manual เท่านั้น</div>
          <p className="mt-1 text-emerald-200/80">คุณต้องใส่ลิงก์และกดโพสต์เองทุกครั้ง</p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          <div className="font-semibold">ไม่เก็บรูปถาวร</div>
          <p className="mt-1 text-blue-200/80">รูปถูกใช้ชั่วคราวเพื่อโพสต์ขึ้น Facebook เท่านั้น</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">ต้องตรวจเองก่อนโพสต์</div>
          <p className="mt-1 text-amber-200/80">ถ้ามีข้อมูลส่วนตัวหรือดราม่าแรง ให้ข้ามทันที</p>
        </div>
      </div>

      <PantipSourceClient
        hasConnectedFacebookPage={hasConnectedFacebookPage}
        facebookPageLabel={facebookPageLabel}
      />
    </div>
  );
}
