import Link from "next/link";

import { resetPasswordAction } from "./actions";

type ResetPasswordPageProps = {
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

function getErrorMessage(error?: string) {
  if (error === "INVALID_TOKEN" || error === "missing_token") {
    return "ลิงก์ตั้งรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่";
  }

  if (error === "password_too_short") {
    return "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร";
  }

  if (error === "password_mismatch") {
    return "รหัสผ่านใหม่และช่องยืนยันรหัสผ่านไม่ตรงกัน";
  }

  if (error === "reset_failed") {
    return "ตั้งรหัสผ่านใหม่ไม่สำเร็จ ลิงก์อาจหมดอายุแล้ว กรุณาขอลิงก์ใหม่";
  }

  return null;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = (await searchParams) ?? {};
  const token = getStringParam(params, "token") ?? "";
  const error = getStringParam(params, "error");
  const errorMessage = getErrorMessage(error);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <div>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white">
            ← กลับหน้าเข้าสู่ระบบ
          </Link>
          <h1 className="mt-6 text-3xl font-bold">ตั้งรหัสผ่านใหม่</h1>
          <p className="mt-2 text-slate-300">
            กรอกรหัสผ่านใหม่สำหรับบัญชี AI Facebook Poster ของคุณ
          </p>
        </div>

        <form
          action={resetPasswordAction}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <input type="hidden" name="token" value={token} />

          <div className="flex flex-col gap-4">
            {errorMessage ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
                {errorMessage}
              </div>
            ) : null}

            {!token ? (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                ไม่พบ token ในลิงก์นี้ กรุณาขอลิงก์ตั้งรหัสผ่านใหม่อีกครั้ง
              </div>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                รหัสผ่านใหม่
              </span>
              <input
                name="newPassword"
                required
                type="password"
                minLength={8}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="อย่างน้อย 8 ตัวอักษร"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                ยืนยันรหัสผ่านใหม่
              </span>
              <input
                name="confirmPassword"
                required
                type="password"
                minLength={8}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
              />
            </label>

            <button
              disabled={!token}
              className="rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ตั้งรหัสผ่านใหม่
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400">
          ลิงก์หมดอายุ?{" "}
          <Link
            href="/forgot-password"
            className="text-blue-300 hover:text-blue-200"
          >
            ขอ reset link ใหม่
          </Link>
        </p>
      </div>
    </main>
  );
}
