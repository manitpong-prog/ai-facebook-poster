"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await authClient.signIn.email({
      email,
      password,
      rememberMe: true,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message ?? "เข้าสู่ระบบไม่สำเร็จ");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-8">
        <div>
          <Link href="/" className="text-sm text-slate-400 hover:text-white">
            ← กลับหน้าแรก
          </Link>
          <h1 className="mt-6 text-3xl font-bold">เข้าสู่ระบบ</h1>
          <p className="mt-2 text-slate-300">
            เข้าสู่ Dashboard เพื่อสร้างโพสต์ด้วย AI
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">อีเมล</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">
                รหัสผ่าน
              </span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                minLength={8}
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-500"
                placeholder="รหัสผ่านของคุณ"
              />
            </label>

            {errorMessage ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </div>
            ) : null}

            <button
              disabled={isSubmitting}
              className="rounded-xl bg-blue-500 px-4 py-3 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-400">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="text-blue-300 hover:text-blue-200">
            สมัครใช้งาน
          </Link>
        </p>
      </div>
    </main>
  );
}
