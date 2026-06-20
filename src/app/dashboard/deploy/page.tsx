import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { db } from "@/db";
import {
  autoPilotRunLogs,
  contentTopics,
  facebookPages,
  posts,
} from "@/db/schema";
import { ensureAutomationSettings } from "@/lib/auto-pilot";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

type CheckStatus = "ready" | "warning" | "missing";

type ReadinessCheck = {
  label: string;
  description: string;
  status: CheckStatus;
  value?: string;
  actionHref?: string;
  actionLabel?: string;
};

const requiredEnvKeys = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "GEMINI_API_KEY",
  "AI_PROVIDER",
  "GEMINI_MODEL",
] as const;

function hasEnvValue(key: string) {
  return Boolean(process.env[key]?.trim());
}

function maskEnvValue(value: string | undefined) {
  if (!value?.trim()) {
    return "ยังไม่ได้ตั้งค่า";
  }

  if (value.length <= 12) {
    return "ตั้งค่าแล้ว";
  }

  if (value.startsWith("http")) {
    return value;
  }

  return `${value.slice(0, 4)}...${value.slice(-4)} (${value.length} ตัวอักษร)`;
}

function getStatusClass(status: CheckStatus) {
  if (status === "ready") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }

  if (status === "warning") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-red-500/30 bg-red-500/10 text-red-100";
}

function getStatusLabel(status: CheckStatus) {
  if (status === "ready") {
    return "พร้อม";
  }

  if (status === "warning") {
    return "ควรเช็ก";
  }

  return "ยังขาด";
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function getBaseUrl() {
  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();

  if (betterAuthUrl) {
    return betterAuthUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function getEnvChecks(): ReadinessCheck[] {
  const baseChecks = requiredEnvKeys.map((key) => ({
    label: key,
    description: "จำเป็นสำหรับ production deployment",
    status: hasEnvValue(key) ? "ready" : "missing",
    value: maskEnvValue(process.env[key]),
  })) satisfies ReadinessCheck[];

  const cronSecretCheck: ReadinessCheck = {
    label: "CRON_SECRET",
    description:
      "จำเป็นเมื่อ deploy production เพื่อกันคนอื่นเรียก endpoint cron โดยไม่ได้รับอนุญาต",
    status: hasEnvValue("CRON_SECRET") ? "ready" : "warning",
    value: hasEnvValue("CRON_SECRET")
      ? maskEnvValue(process.env.CRON_SECRET)
      : "ยังไม่ตั้งก็ได้ใน local แต่ควรตั้งก่อนขึ้น Vercel",
  };

  return [...baseChecks, cronSecretCheck];
}

function getVercelChecks(): ReadinessCheck[] {
  const isVercel = process.env.VERCEL === "1";
  const vercelEnv = process.env.VERCEL_ENV;
  const vercelUrl = process.env.VERCEL_URL;

  return [
    {
      label: "Deployment runtime",
      description: "บอกว่ารันอยู่บนเครื่อง local หรือ Vercel",
      status: isVercel ? "ready" : "warning",
      value: isVercel ? `Vercel (${vercelEnv ?? "unknown"})` : "Local development",
    },
    {
      label: "Production URL",
      description: "ใช้เป็น base URL สำหรับ callback/auth และ external cron",
      status: hasEnvValue("BETTER_AUTH_URL") || Boolean(vercelUrl)
        ? "ready"
        : "warning",
      value: getBaseUrl(),
    },
    {
      label: "Cron path",
      description: "endpoint ที่ Vercel Cron หรือ external cron ต้องเรียก",
      status: "ready",
      value: "/api/cron/publish-scheduled",
    },
  ];
}

async function getDeployReadinessData(workspaceId: string) {
  const [
    settings,
    topicRows,
    postRows,
    connectedPage,
    latestRunLog,
  ] = await Promise.all([
    ensureAutomationSettings(workspaceId),
    db
      .select({ status: contentTopics.status })
      .from(contentTopics)
      .where(eq(contentTopics.workspaceId, workspaceId)),
    db
      .select({ status: posts.status })
      .from(posts)
      .where(eq(posts.workspaceId, workspaceId)),
    db
      .select({
        pageName: facebookPages.pageName,
        pageId: facebookPages.pageId,
        status: facebookPages.status,
        accessTokenEncrypted: facebookPages.accessTokenEncrypted,
        lastTestedAt: facebookPages.lastTestedAt,
      })
      .from(facebookPages)
      .where(
        and(
          eq(facebookPages.workspaceId, workspaceId),
          eq(facebookPages.status, "connected"),
        ),
      )
      .limit(1),
    db
      .select({
        status: autoPilotRunLogs.status,
        runTrigger: autoPilotRunLogs.runTrigger,
        topicTitle: autoPilotRunLogs.topicTitle,
        errorMessage: autoPilotRunLogs.errorMessage,
        finishedAt: autoPilotRunLogs.finishedAt,
        createdAt: autoPilotRunLogs.createdAt,
      })
      .from(autoPilotRunLogs)
      .where(eq(autoPilotRunLogs.workspaceId, workspaceId))
      .orderBy(desc(autoPilotRunLogs.createdAt))
      .limit(1),
  ]);

  return {
    settings,
    topicRows,
    postRows,
    connectedPage,
    latestRunLog,
  };
}

function renderCheckCard(check: ReadinessCheck) {
  return (
    <div
      key={check.label}
      className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-100">{check.label}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {check.description}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
            check.status,
          )}`}
        >
          {getStatusLabel(check.status)}
        </span>
      </div>

      {check.value ? (
        <div className="mt-4 break-words rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-300">
          {check.value}
        </div>
      ) : null}

      {check.actionHref && check.actionLabel ? (
        <Link
          href={check.actionHref}
          className="mt-4 inline-flex text-sm font-semibold text-blue-200 underline underline-offset-4"
        >
          {check.actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default async function DeployReadinessPage() {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลด Deployment Readiness ไม่สำเร็จ"
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

  let readinessData: Awaited<ReturnType<typeof getDeployReadinessData>>;

  try {
    readinessData = await getDeployReadinessData(currentMembership.workspaceId);
  } catch (deployError) {
    return (
      <DashboardLoadError
        title="โหลดข้อมูล Deployment ไม่สำเร็จ"
        technicalMessage={getSessionErrorMessage(deployError)}
      />
    );
  }

  const { settings, topicRows, postRows, connectedPage, latestRunLog } =
    readinessData;
  const [page] = connectedPage;
  const [runLog] = latestRunLog;

  const activeTopicCount = topicRows.filter((row) => row.status === "active").length;
  const postedCount = postRows.filter((row) => row.status === "posted").length;
  const errorPostCount = postRows.filter((row) => row.status === "error").length;
  const scheduledPostCount = postRows.filter(
    (row) => row.status === "scheduled",
  ).length;
  const hasFacebookPage = Boolean(page?.pageId && page.accessTokenEncrypted);
  const hasGeminiApiKey = hasEnvValue("GEMINI_API_KEY");
  const hasCronSecret = hasEnvValue("CRON_SECRET");
  const baseUrl = getBaseUrl();
  const productionCronUrl = `${baseUrl}/api/cron/publish-scheduled`;
  const externalCronUrl = `${productionCronUrl}?secret=YOUR_CRON_SECRET`;

  const appChecks: ReadinessCheck[] = [
    {
      label: "Database",
      description: "โหลดข้อมูล Workspace จากฐานข้อมูลได้ แปลว่า DATABASE_URL ใช้ได้",
      status: "ready",
      value: currentMembership.workspaceName,
    },
    {
      label: "Gemini API",
      description: "ใช้สำหรับให้ AI เขียนบทความจาก Topic Queue",
      status: hasGeminiApiKey ? "ready" : "missing",
      value: hasGeminiApiKey
        ? `พร้อมใช้ model: ${process.env.GEMINI_MODEL ?? "ไม่ระบุ"}`
        : "ยังไม่มี GEMINI_API_KEY",
      actionHref: "/dashboard/style",
      actionLabel: "เปิด Writing Style",
    },
    {
      label: "Facebook Page",
      description: "ใช้สำหรับโพสต์ไปยัง Facebook Page ผ่าน Page Access Token",
      status: hasFacebookPage ? "ready" : "missing",
      value: hasFacebookPage
        ? `${page?.pageName ?? "Facebook Page"} (${page?.pageId}) · ทดสอบล่าสุด ${formatDate(
            page?.lastTestedAt,
          )}`
        : "ยังไม่มี Page Access Token ที่พร้อมโพสต์",
      actionHref: "/dashboard/facebook",
      actionLabel: "เปิด Facebook Page Settings",
    },
    {
      label: "Topic Queue",
      description: "Auto Pilot ต้องมีหัวข้อสถานะรอใช้ก่อนจึงจะเขียนเองได้",
      status: activeTopicCount > 0 ? "ready" : "warning",
      value: `หัวข้อรอใช้ ${activeTopicCount} รายการ`,
      actionHref: "/dashboard/topics",
      actionLabel: "เปิด Topic Queue",
    },
    {
      label: "Auto Pilot",
      description: "ตัวตั้งค่ารอบอัตโนมัติว่าจะเขียนไว้ให้ตรวจหรือโพสต์เอง",
      status: settings.isEnabled ? "ready" : "warning",
      value: settings.isEnabled
        ? `เปิดอยู่ · โหมด ${settings.mode} · ทุก ${settings.frequencyDays} วัน เวลา ${settings.postTime}`
        : "ยังปิดอยู่ เปิดได้เมื่อพร้อมให้ระบบรันอัตโนมัติ",
      actionHref: "/dashboard/autopilot",
      actionLabel: "เปิด Auto Pilot",
    },
    {
      label: "Cron Secret",
      description: "ต้องตั้งก่อนให้ external cron หรือ production cron เรียก endpoint",
      status: hasCronSecret ? "ready" : "warning",
      value: hasCronSecret
        ? "ตั้งค่าแล้ว ระบบจะตรวจ Authorization header หรือ ?secret=..."
        : "local ยังใช้ได้ แต่ production ควรตั้ง CRON_SECRET ก่อน deploy จริง",
    },
  ];

  const allRequiredEnvReady = requiredEnvKeys.every((key) => hasEnvValue(key));
  const productionReady = Boolean(
    allRequiredEnvReady && hasFacebookPage && hasGeminiApiKey && hasCronSecret,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">Deploy</p>
          <h1 className="mt-2 text-3xl font-bold">
            ตรวจความพร้อมก่อนขึ้น Vercel
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            หน้านี้ใช้เช็กว่า environment, Gemini, Facebook Page, Topic Queue,
            Auto Pilot และ Cron พร้อมสำหรับ production แล้วหรือยัง
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          กลับ Dashboard
        </Link>
      </div>

      <section
        className={`mt-8 rounded-2xl border p-6 ${
          productionReady
            ? "border-emerald-500/30 bg-emerald-500/10"
            : "border-amber-500/30 bg-amber-500/10"
        }`}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {productionReady
                ? "พร้อมสำหรับ deploy production"
                : "ยังมีบางจุดที่ควรเช็กก่อน deploy production"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              คุณยังพัฒนาต่อใน local ได้ตามปกติ การขึ้น Vercel ค่อยทำเมื่ออยากให้ระบบรันเองตอนปิดเครื่องหรือให้ Cron ทำงานจริง
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
              productionReady ? "ready" : "warning",
            )}`}
          >
            {productionReady ? "Production ready" : "Review needed"}
          </span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">App readiness</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {appChecks.map(renderCheckCard)}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Environment variables</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ตั้งค่าเหล่านี้ใน Vercel Project Settings → Environment Variables ก่อน deploy production
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {getEnvChecks().map(renderCheckCard)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Vercel / Cron</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            ระบบมี `vercel.json` แล้ว แต่คุณยังสามารถใช้ external cron ได้ถ้า Vercel plan ยังไม่เหมาะกับการรันถี่ ๆ
          </p>
          <div className="mt-5 space-y-3">
            {getVercelChecks().map(renderCheckCard)}
          </div>

          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-100">
              Production cron URL
            </div>
            <div className="mt-3 break-all rounded-lg bg-slate-900 p-3 text-xs leading-5 text-slate-300">
              {productionCronUrl}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div className="text-sm font-semibold text-slate-100">
              External cron URL
            </div>
            <div className="mt-3 break-all rounded-lg bg-slate-900 p-3 text-xs leading-5 text-slate-300">
              {externalCronUrl}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              อย่าแปะ secret จริงในที่สาธารณะ ใช้ค่านี้เฉพาะใน cron-job.org หรือ service ที่คุณควบคุมเท่านั้น
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">ข้อมูลล่าสุดในระบบ</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs text-slate-500">โพสต์สำเร็จ</div>
              <div className="mt-1 text-2xl font-bold">{postedCount}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs text-slate-500">โพสต์ตั้งเวลา</div>
              <div className="mt-1 text-2xl font-bold">{scheduledPostCount}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs text-slate-500">โพสต์ Error</div>
              <div className="mt-1 text-2xl font-bold">{errorPostCount}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs text-slate-500">รอบถัดไป</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {formatDate(settings.nextRunAt)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Auto Pilot log ล่าสุด</h2>
          {runLog ? (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {runLog.runTrigger === "cron" ? "Cron" : "กดรันเอง"}
                </span>
                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {runLog.status}
                </span>
              </div>
              <div className="mt-4 text-sm leading-6 text-slate-300">
                หัวข้อ: {runLog.topicTitle || "-"}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                เวลา: {formatDate(runLog.finishedAt ?? runLog.createdAt)}
              </div>
              {runLog.errorMessage ? (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
                  {runLog.errorMessage}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-400">
              ยังไม่มี Auto Pilot run log
            </p>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-blue-100">
              คู่มือ deploy production พร้อมแล้ว
            </h2>
            <p className="mt-2 text-sm leading-6 text-blue-100/80">
              รอบนี้เพิ่มไฟล์ `docs/deploy-vercel.md` และ `.env.vercel.example`
              เพื่อใช้เป็นคู่มือเมื่อต้องการขึ้น Vercel จริง
            </p>
          </div>
          <span className="rounded-full border border-blue-400/30 bg-blue-400/10 px-3 py-1 text-xs font-semibold text-blue-100">
            Step 23.2
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-blue-400/20 bg-slate-950/70 p-4">
            <div className="text-sm font-semibold text-blue-100">
              ไฟล์คู่มือ
            </div>
            <div className="mt-3 rounded-lg bg-slate-900 p-3 text-xs leading-5 text-slate-300">
              docs/deploy-vercel.md
            </div>
            <p className="mt-3 text-xs leading-5 text-blue-100/70">
              มีขั้นตอน import project, ตั้งค่า env, migration, Facebook test,
              cron และ smoke test หลัง deploy
            </p>
          </div>

          <div className="rounded-xl border border-blue-400/20 bg-slate-950/70 p-4">
            <div className="text-sm font-semibold text-blue-100">
              Environment template
            </div>
            <div className="mt-3 rounded-lg bg-slate-900 p-3 text-xs leading-5 text-slate-300">
              .env.vercel.example
            </div>
            <p className="mt-3 text-xs leading-5 text-blue-100/70">
              ใช้เป็นรายการคีย์ที่ต้อง copy ไปตั้งใน Vercel Project Settings
              โดยไม่ต้องเปิดเผยค่าจริงบนหน้าเว็บ
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">ลำดับ deploy ที่แนะนำ</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-300">
          <li>Commit โค้ดล่าสุดใน GitHub Desktop</li>
          <li>Push ขึ้น GitHub</li>
          <li>Import repository เข้า Vercel หรือให้ Vercel redeploy จาก repository เดิม</li>
          <li>ตั้ง Environment Variables ตามรายการด้านบน</li>
          <li>รัน migration กับ Neon ก่อนเปิดใช้งาน production ถ้ายังไม่ได้รัน schema ล่าสุด</li>
          <li>ทดสอบ login, Facebook Page, Auto Pilot และ cron endpoint บน production</li>
          <li>ถ้าทุกอย่างผ่าน ค่อยเปิด Auto Pilot โหมด auto_publish</li>
        </ol>
      </section>
    </div>
  );
}
