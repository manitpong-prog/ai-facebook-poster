import Link from "next/link";

import { requestPasswordResetAction } from "./actions";

type ForgotPasswordPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const sent = getStringParam(params, "sent") === "1";
  const error = getStringParam(params, "error");
  const email = getStringParam(params, "email") ?? "";
  const debugLink = getStringParam(params, "debugLink");

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white">
            ← กลับหน้าเข้าสู่ระบบ
          </Link>
          <h1 className="mt-6 text-3xl font-bold">ลืมรหัสผ่าน</h1>
          <p className="mt-2 text-slate-300">
            ใส่อีเมลของคุณ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้
          </p>
        </div>

        <form
          action={requestPasswordResetAction}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">อีเมล</span>
              <input
                name="email"
                required
                type="email"
                defaultValue={email}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="you@example.com"
              />
            </label>

            {error === "missing_email" ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                กรุณากรอกอีเมลก่อนครับ
              </div>
            ) : null}

            {sent ? (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                ถ้ามีบัญชีนี้อยู่ในระบบ จะมีลิงก์ตั้งรหัสผ่านใหม่ส่งไปที่อีเมลนี้ครับ
              </div>
            ) : null}

            {debugLink ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                <div className="font-semibold">โหมดทดสอบ: Reset link</div>
                <p className="mt-1 text-amber-100/80">
                  ใช้ลิงก์นี้เฉพาะตอนทดสอบเท่านั้น ปิด PASSWORD_RESET_DEBUG_LINKS ก่อนใช้งานจริง
                </p>
                <Link
                  href={debugLink}
                  className="mt-3 inline-flex break-all text-blue-200 underline underline-offset-4"
                >
                  เปิดลิงก์ตั้งรหัสผ่านใหม่
                </Link>
              </div>
            ) : null}

            <button className="rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400">
              ส่งลิงก์ตั้งรหัสผ่านใหม่
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400">
          จำรหัสผ่านได้แล้ว?{" "}
          <Link href="/login" className="text-blue-300 hover:text-blue-200">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </main>
  );
}
