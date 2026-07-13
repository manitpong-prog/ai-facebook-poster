import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardLoadError } from "@/components/dashboard/dashboard-load-error";
import { ApiKeyDisplay } from "@/components/settings/api-key-display";
import {
  getGeminiSettingsSummary,
  revealEffectiveGeminiApiKey,
} from "@/lib/ai/settings";
import { getDashboardContext } from "@/lib/dashboard-context";
import { getSessionErrorMessage } from "@/lib/session";

import {
  deleteWorkspaceGeminiKeyAction,
  saveGeminiSettingsAction,
  testAndSaveGeminiSettingsAction,
  testCurrentGeminiSettingsAction,
} from "./actions";

type AiSettingsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    tested?: string;
    deleted?: string;
    showKey?: string;
    error?: string;
    message?: string;
    model?: string;
    source?: string;
  }>;
};

const errorLabels: Record<string, string> = {
  session_failed: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่",
  forbidden: "บัญชีนี้ไม่มีสิทธิ์เปลี่ยนการตั้งค่า AI",
  invalid_key: "API Key สั้นหรือรูปแบบไม่ครบ กรุณาวางคีย์เต็มอีกครั้ง",
  invalid_model: "Gemini Model ที่กรอกไม่ใช่โมเดลสร้างข้อความ",
  key_required: "ยังไม่มี API Key ให้ใช้งาน กรุณาวางคีย์ใหม่ก่อน",
  save_failed: "บันทึก Gemini API Key ไม่สำเร็จ",
  test_failed: "ทดสอบ Gemini API Key ไม่สำเร็จ",
  delete_failed: "ลบคีย์ที่บันทึกในหน้าเว็บไม่สำเร็จ",
  reveal_failed: "ถอดรหัสหรือแสดง API Key ไม่สำเร็จ",
};

const sourceLabels: Record<string, string> = {
  workspace: "คีย์จากหน้า AI Settings ในฐานข้อมูล",
  environment: "คีย์สำรองจาก GEMINI_API_KEY บน Vercel/.env.local",
  override: "คีย์ใหม่ที่เพิ่งวางในแบบฟอร์ม",
  new_key: "คีย์ใหม่ที่เพิ่งทดสอบและบันทึก",
  missing: "ยังไม่มีคีย์",
};

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

export default async function AiSettingsPage({
  searchParams,
}: AiSettingsPageProps) {
  const { session, currentMembership, error } = await getDashboardContext();

  if (error) {
    return (
      <DashboardLoadError
        title="โหลด AI Settings ไม่สำเร็จ"
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

  const query = await searchParams;
  let summary;
  let revealedApiKey: string | null = null;
  let revealError = "";

  try {
    summary = await getGeminiSettingsSummary(currentMembership.workspaceId);

    if (query?.showKey === "1" && summary.hasUsableApiKey) {
      const revealed = await revealEffectiveGeminiApiKey(
        currentMembership.workspaceId,
      );
      revealedApiKey = revealed.apiKey;
    }
  } catch (settingsError) {
    if (query?.showKey === "1") {
      revealError = getSessionErrorMessage(settingsError);
      summary = await getGeminiSettingsSummary(currentMembership.workspaceId);
    } else {
      return (
        <DashboardLoadError
          title="โหลดการตั้งค่า Gemini ไม่สำเร็จ"
          technicalMessage={getSessionErrorMessage(settingsError)}
        />
      );
    }
  }

  const errorCode = revealError ? "reveal_failed" : query?.error;
  const errorMessage = errorCode ? errorLabels[errorCode] : "";
  const technicalMessage = revealError || query?.message || "";
  const canManageSettings =
    currentMembership.role === "owner" || currentMembership.role === "admin";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-blue-200">AI Settings</p>
          <h1 className="mt-2 text-3xl font-bold">Gemini API Key</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            เปลี่ยนคีย์และโมเดลจากหน้าเว็บได้ทันที หลังตั้งค่าครั้งแรกบน
            Vercel แล้ว การสร้างโพสต์ทุกส่วนจะใช้คีย์จากหน้านี้ก่อน
            และใช้คีย์บน Vercel เป็นตัวสำรอง
          </p>
        </div>

        <Link
          href="/dashboard/deploy"
          className="rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-slate-200 hover:border-slate-500"
        >
          เปิดหน้า Deploy Check
        </Link>
      </div>

      {query?.saved === "1" ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          บันทึกการตั้งค่า Gemini แล้ว ระบบจะใช้ค่าใหม่ทันทีโดยไม่ต้อง Redeploy
        </div>
      ) : null}

      {query?.tested === "1" ? (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
          ทดสอบ Gemini สำเร็จ · model={query.model || summary.model} · แหล่งคีย์=
          {sourceLabels[query.source || summary.source] || query.source}
        </div>
      ) : null}

      {query?.deleted === "1" ? (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          ลบคีย์ที่บันทึกผ่านหน้าเว็บแล้ว ตอนนี้ระบบจะกลับไปใช้
          GEMINI_API_KEY บน Vercel หากยังตั้งค่าไว้
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
          <div className="font-semibold">{errorMessage}</div>
          {technicalMessage ? (
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-red-400/20 bg-slate-950 p-3 text-xs text-red-100/90">
              {technicalMessage}
            </pre>
          ) : null}
        </div>
      ) : null}

      {!summary.encryptionReady ? (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
          <div className="font-semibold">ยังตั้งค่า APP_ENCRYPTION_KEY ไม่ครบ</div>
          <p className="mt-2">
            ต้องเพิ่มตัวแปรนี้ใน Vercel หนึ่งครั้งก่อน จึงจะบันทึกคีย์จากหน้าเว็บได้
            คีย์นี้ใช้สำหรับเข้ารหัสและถอดรหัส Gemini API Key ในฐานข้อมูล
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-amber-400/20 bg-slate-950 p-3 text-xs">
            {summary.encryptionError}
          </pre>
        </div>
      ) : null}

      <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">คีย์ที่กำลังใช้งาน</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  ระบบเลือกคีย์จากฐานข้อมูลก่อน แล้วจึงใช้ Environment เป็นตัวสำรอง
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  summary.hasUsableApiKey
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                    : "border-red-500/30 bg-red-500/10 text-red-100"
                }`}
              >
                {summary.hasUsableApiKey ? "พร้อมใช้" : "ยังไม่มีคีย์"}
              </span>
            </div>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">แหล่งที่มา</dt>
                <dd className="mt-1 text-slate-200">
                  {sourceLabels[summary.source]}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">คีย์แบบย่อ</dt>
                <dd className="mt-1 break-all font-mono text-xs text-slate-200">
                  {summary.maskedApiKey}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">โมเดล</dt>
                <dd className="mt-1 font-mono text-xs text-slate-200">
                  {summary.model}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">อัปเดตผ่านหน้าเว็บล่าสุด</dt>
                <dd className="mt-1 text-slate-200">
                  {formatDate(summary.updatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">ทดสอบสำเร็จล่าสุด</dt>
                <dd className="mt-1 text-slate-200">
                  {formatDate(summary.lastTestedAt)}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-800 pt-5">
              {summary.hasUsableApiKey ? (
                <Link
                  href="/dashboard/settings/ai?showKey=1"
                  className="rounded-xl border border-blue-400/40 px-4 py-2 text-sm font-semibold text-blue-100 hover:bg-blue-500/10"
                >
                  แสดงคีย์เต็ม
                </Link>
              ) : null}

              <form action={testCurrentGeminiSettingsAction}>
                <button
                  type="submit"
                  disabled={!summary.hasUsableApiKey}
                  className="rounded-xl border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ทดสอบคีย์ปัจจุบัน
                </button>
              </form>
            </div>
          </div>

          {summary.hasWorkspaceKey ? (
            <form
              action={deleteWorkspaceGeminiKeyAction}
              className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6"
            >
              <h2 className="text-lg font-semibold text-red-100">
                ลบคีย์จากหน้าเว็บ
              </h2>
              <p className="mt-2 text-sm leading-6 text-red-100/75">
                หลังลบ ระบบจะกลับไปใช้ GEMINI_API_KEY จาก Vercel หากมีอยู่
                โดยจะไม่ลบตัวแปรบน Vercel ให้
              </p>
              <button
                type="submit"
                className="mt-4 rounded-xl border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10"
              >
                ลบคีย์ที่บันทึกในฐานข้อมูล
              </button>
            </form>
          ) : null}
        </aside>

        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">เปลี่ยน Gemini API Key</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            วางคีย์ใหม่แล้วกด “ทดสอบและบันทึก” ระบบจะทดสอบกับ Gemini ก่อน
            หากผ่านจึงเข้ารหัสและบันทึก คีย์ใหม่จะเริ่มใช้งานทันที
          </p>

          <form className="mt-6 space-y-5">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                Gemini API Key ใหม่
              </span>
              <textarea
                name="apiKey"
                rows={4}
                autoComplete="new-password"
                spellCheck={false}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-white outline-none focus:border-blue-500"
                placeholder="วาง API Key ใหม่ หรือเว้นว่างเพื่อแก้เฉพาะโมเดล/ทดสอบคีย์ปัจจุบัน"
              />
              <span className="text-xs leading-5 text-slate-500">
                ระบบจะลบช่องว่างก่อนบันทึก และจะไม่ส่งคีย์กลับมาในหน้าปกติ
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                Gemini Model
              </span>
              <input
                name="model"
                defaultValue={summary.model}
                list="recommended-gemini-models"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-sm text-white outline-none focus:border-blue-500"
                placeholder="gemini-2.5-flash-lite"
              />
              <datalist id="recommended-gemini-models">
                <option value="gemini-2.5-flash-lite" />
                <option value="gemini-2.5-flash" />
              </datalist>
              <span className="text-xs leading-5 text-slate-500">
                แนะนำให้ใช้ gemini-2.5-flash-lite หรือ gemini-2.5-flash
                อย่าใช้ชื่อที่มี image, TTS, Live, Embedding, Imagen หรือ Veo
                เพราะโมเดลเหล่านั้นอาจไม่คืนข้อความสำหรับโพสต์
              </span>
            </label>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-400">
              ลำดับการเลือกคีย์: คีย์จากหน้านี้ → GEMINI_API_KEY บน Vercel →
              แจ้งว่ายังไม่ได้ตั้งค่า การเปลี่ยนคีย์ในหน้านี้ไม่ต้อง Redeploy
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row">
              <button
                type="submit"
                formAction={testAndSaveGeminiSettingsAction}
                disabled={!canManageSettings || !summary.encryptionReady}
                className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ทดสอบและบันทึก
              </button>
              <button
                type="submit"
                formAction={saveGeminiSettingsAction}
                disabled={!canManageSettings || !summary.encryptionReady}
                className="rounded-xl border border-blue-400/40 px-5 py-3 text-sm font-semibold text-blue-100 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                บันทึกโดยไม่ทดสอบ
              </button>
            </div>
          </form>
        </article>
      </section>

      {revealedApiKey ? (
        <section className="mt-6">
          <ApiKeyDisplay
            apiKey={revealedApiKey}
            sourceLabel={sourceLabels[summary.source]}
          />
        </section>
      ) : null}
    </div>
  );
}
