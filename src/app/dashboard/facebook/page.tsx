import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { db } from "@/db";
import { facebookPages } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

import {
  saveFacebookPageAction,
  testFacebookPagePostAction,
} from "./actions";

type FacebookPageProps = {
  searchParams?: Promise<{
    saved?: string;
    tested?: string;
    error?: string;
    saveError?: string;
    testError?: string;
    message?: string;
    facebookPostId?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  not_connected: "ยังไม่ได้เชื่อมต่อ",
  connected: "เชื่อมต่อแล้ว",
  expired: "Token หมดอายุ",
  error: "เชื่อมต่อมีปัญหา",
};

const statusClassNames: Record<string, string> = {
  not_connected: "border-slate-700 bg-slate-800 text-slate-200",
  connected: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  expired: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  error: "border-red-500/40 bg-red-500/10 text-red-100",
};

const saveErrorLabels: Record<string, string> = {
  page_required: "กรุณาใส่ชื่อเพจและ Page ID",
  token_required: "กรุณาใส่ Page Access Token อย่างน้อย 1 ครั้งก่อนบันทึก",
  save_failed: "บันทึกข้อมูลเพจไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
};

const testErrorLabels: Record<string, string> = {
  message_required: "กรุณาใส่ข้อความทดสอบอย่างน้อย 3 ตัวอักษร",
  page_not_connected: "ยังไม่มีข้อมูลเพจหรือ Page Access Token ที่บันทึกไว้",
  facebook_failed: "Facebook API โพสต์ทดสอบไม่สำเร็จ กรุณาเช็ก Page Access Token และ permission",
};

const errorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่แล้วกดอีกครั้ง",
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

function maskToken(token: string | null) {
  if (!token) {
    return "ยังไม่ได้บันทึก";
  }

  if (token.length <= 18) {
    return "บันทึกแล้ว";
  }

  return `${token.slice(0, 10)}...${token.slice(-6)} (${token.length} ตัวอักษร)`;
}

function buildFacebookPostUrl(facebookPostId: string | undefined) {
  if (!facebookPostId) {
    return "";
  }

  return `https://www.facebook.com/${facebookPostId}`;
}

export default async function FacebookPage({ searchParams }: FacebookPageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลด Facebook Page Settings ไม่สำเร็จ"
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

  let facebookPage: typeof facebookPages.$inferSelect | undefined;

  try {
    [facebookPage] = await db
      .select()
      .from(facebookPages)
      .where(eq(facebookPages.workspaceId, currentMembership.workspaceId))
      .limit(1);
  } catch (facebookPageError) {
    return (
      <DashboardLoadError
        title="โหลดข้อมูลเพจไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(facebookPageError)}
      />
    );
  }

  const query = await searchParams;
  const status = facebookPage?.status ?? "not_connected";
  const savedMessage = query?.saved === "1";
  const testedMessage = query?.tested === "1";
  const postUrl = buildFacebookPostUrl(query?.facebookPostId);

  const saveErrorMessage = query?.saveError
    ? saveErrorLabels[query.saveError] ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่"
    : "";
  const testErrorMessage = query?.testError
    ? testErrorLabels[query.testError] ?? "ทดสอบโพสต์ไม่สำเร็จ กรุณาลองใหม่"
    : "";
  const errorMessage = query?.error ? errorLabels[query.error] : "";

  const defaultTestMessage = `ทดสอบโพสต์จากระบบ AI Facebook Poster - ${new Intl.DateTimeFormat(
    "th-TH",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    },
  ).format(new Date())}`;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Facebook Page</p>
          <h1 className="mt-2 text-3xl font-bold">ตั้งค่าเพจ Facebook</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            บันทึก Page ID และ Page Access Token ที่ทดสอบผ่านแล้ว เพื่อให้ระบบสามารถโพสต์ไปยังเพจได้ในขั้นถัดไป
          </p>
        </div>

        <Link
          href="/dashboard/posts"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          กลับไปดูโพสต์
        </Link>
      </div>

      {savedMessage ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          บันทึกข้อมูล Facebook Page เรียบร้อยแล้ว
        </div>
      ) : null}

      {testedMessage ? (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <div>โพสต์ทดสอบไปยังเพจสำเร็จแล้ว</div>
          {query?.facebookPostId ? (
            <div className="mt-2 text-xs text-emerald-100/80">
              Facebook Post ID: {query.facebookPostId}
            </div>
          ) : null}
          {postUrl ? (
            <a
              href={postUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-sm font-semibold text-emerald-100 underline underline-offset-4"
            >
              เปิดโพสต์บน Facebook
            </a>
          ) : null}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {saveErrorMessage ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {saveErrorMessage}
        </div>
      ) : null}

      {testErrorMessage ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <div>{testErrorMessage}</div>
          {query?.message ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-red-950/50 p-3 text-xs leading-5 text-red-100/90">
              {query.message}
            </pre>
          ) : null}
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">ข้อมูลเพจ</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ใช้ Page Access Token ตัวเต็มที่ PowerShell หรือ Graph API Explorer โพสต์ผ่านแล้ว ถ้ามี token เดิมอยู่ สามารถเว้นช่อง token ว่างเพื่อใช้ตัวเดิมได้
          </p>

          <form action={saveFacebookPageAction} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="pageName"
                className="text-sm font-medium text-slate-200"
              >
                Page Name
              </label>
              <input
                id="pageName"
                name="pageName"
                defaultValue={facebookPage?.pageName ?? "iM Sticker Shop สติกเกอร์ Line"}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                placeholder="เช่น iM Sticker Shop สติกเกอร์ Line"
              />
            </div>

            <div>
              <label
                htmlFor="pageId"
                className="text-sm font-medium text-slate-200"
              >
                Page ID
              </label>
              <input
                id="pageId"
                name="pageId"
                defaultValue={facebookPage?.pageId ?? "105037572408076"}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                placeholder="105037572408076"
              />
            </div>

            <div>
              <label
                htmlFor="pageAccessToken"
                className="text-sm font-medium text-slate-200"
              >
                Page Access Token
              </label>
              <textarea
                id="pageAccessToken"
                name="pageAccessToken"
                rows={5}
                className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-white outline-none transition focus:border-blue-500"
                placeholder={
                  facebookPage?.accessTokenEncrypted
                    ? "มี token เดิมแล้ว: เว้นว่างไว้เพื่อใช้ token เดิม หรือวาง token ใหม่เพื่อแทนที่"
                    : "วาง Page Access Token ตัวเต็มที่นี่"
                }
              />
              <p className="mt-2 text-xs leading-5 text-slate-500">
                ช่วง MVP จะเก็บ token แบบ dev-only ในคอลัมน์ access_token_encrypted ก่อน เพื่อให้ทดสอบ flow ได้ง่าย ภายหลังค่อยเพิ่ม encryption จริงสำหรับ production
              </p>
            </div>

            <SubmitButton
              pendingText="กำลังบันทึกเพจ..."
              className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              บันทึก Facebook Page
            </SubmitButton>
          </form>
        </article>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">สถานะการเชื่อมต่อ</h2>
                <p className="mt-2 text-sm text-slate-400">
                  ข้อมูลล่าสุดของเพจที่บันทึกใน Workspace นี้
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  statusClassNames[status] ?? statusClassNames.not_connected
                }`}
              >
                {statusLabels[status] ?? status}
              </span>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-300">
              <div>
                <div className="text-slate-500">Page Name</div>
                <div>{facebookPage?.pageName ?? "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Page ID</div>
                <div>{facebookPage?.pageId ?? "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Token</div>
                <div className="break-all font-mono text-xs">
                  {maskToken(facebookPage?.accessTokenEncrypted ?? null)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">ทดสอบล่าสุด</div>
                <div>{formatDate(facebookPage?.lastTestedAt ?? null)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h2 className="text-xl font-semibold text-amber-100">
              ทดสอบโพสต์จริง
            </h2>
            <p className="mt-2 text-sm leading-6 text-amber-100/75">
              ปุ่มนี้จะสร้างโพสต์จริงบน Facebook Page เหมือนที่ทดสอบผ่านใน PowerShell และ Graph API Explorer
            </p>

            <form action={testFacebookPagePostAction} className="mt-5 space-y-4">
              <textarea
                name="message"
                rows={5}
                defaultValue={defaultTestMessage}
                className="w-full rounded-xl border border-amber-500/30 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-amber-400"
              />

              <SubmitButton
                disabled={!facebookPage?.pageId || !facebookPage.accessTokenEncrypted}
                pendingText="กำลังโพสต์ทดสอบ..."
                className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                โพสต์ทดสอบไปที่เพจ
              </SubmitButton>
            </form>

            {!facebookPage?.pageId || !facebookPage.accessTokenEncrypted ? (
              <p className="mt-3 text-xs leading-5 text-amber-100/70">
                ต้องบันทึก Page ID และ Page Access Token ก่อนจึงจะทดสอบโพสต์ได้
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
