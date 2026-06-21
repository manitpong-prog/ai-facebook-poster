import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { db } from "@/db";
import { facebookPages } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getNewsSources } from "@/lib/news/rss";
import { getSessionErrorMessage } from "@/lib/session";

import { NewsSourceClient } from "./news-source-client";

export const dynamic = "force-dynamic";

export default async function NewsSourcePage() {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลดหน้าโพสต์จากข่าวไม่สำเร็จ"
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
        <p className="text-sm font-medium text-blue-300">Manual News Source Post</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">โพสต์จากข่าว RSS</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          เลือกข่าวจาก RSS ให้ AI อ่าน/แปลเพื่อสรุปเป็นภาษาไทยในสไตล์เพจ แล้วตรวจเองก่อนกดโพสต์ ไม่มีการตั้งเวลา ไม่มีการโพสต์อัตโนมัติ และไม่ดึงรูปข่าวมาใช้
        </p>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <div className="font-semibold">Manual เท่านั้น</div>
          <p className="mt-1 text-emerald-200/80">คุณเลือกข่าวและกดโพสต์เองทุกครั้ง</p>
        </div>
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
          <div className="font-semibold">ใช้ Writing Style เดิม</div>
          <p className="mt-1 text-blue-200/80">โพสต์จะใช้โทนเดียวกับระบบเขียนโพสต์อัตโนมัติ</p>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <div className="font-semibold">อ้างอิงต้นทางเสมอ</div>
          <p className="mt-1 text-amber-200/80">โพสต์ต้องมีที่มาและลิงก์อ่านต่อทุกครั้ง</p>
        </div>
      </div>

      <NewsSourceClient
        sources={getNewsSources()}
        hasConnectedFacebookPage={hasConnectedFacebookPage}
        facebookPageLabel={facebookPageLabel}
      />
    </div>
  );
}
