import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <nav className="mb-16 flex items-center justify-between">
          <div className="text-lg font-bold">AI Facebook Poster</div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
            >
              เริ่มใช้งาน
            </Link>
          </div>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-2 text-sm text-blue-200">
              AI Content Dashboard for Facebook Pages
            </p>

            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
              ใส่แค่หัวข้อ แล้วให้ AI เขียนโพสต์เพจในสไตล์ของคุณ
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              ระบบช่วยสร้างโพสต์ Facebook Page จากหัวข้อสั้น ๆ รองรับ Preview,
              แก้ไขข้อความ, โพสต์ทันที และตั้งเวลาโพสต์ในอนาคต
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-xl bg-blue-500 px-6 py-3 text-center font-semibold text-white hover:bg-blue-400"
              >
                สร้างบัญชีฟรี
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-slate-700 px-6 py-3 text-center font-semibold text-slate-200 hover:border-slate-500"
              >
                เข้าสู่ Dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="rounded-2xl bg-slate-950 p-5">
              <div className="text-sm text-slate-400">หัวข้อโพสต์</div>
              <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-100">
                วิธีทำให้ลูกค้าเก่ากลับมาซื้อซ้ำ
              </div>

              <div className="mt-5 text-sm text-slate-400">สไตล์การเขียน</div>
              <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-100">
                เป็นกันเอง อ่านง่าย เหมือนเจ้าของเพจเล่าเอง ไม่ขายของแรง
                ไม่เกิน 300 คำ
              </div>

              <div className="mt-5 rounded-xl bg-blue-500 p-4 text-center font-semibold">
                ให้ AI เขียนโพสต์
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-16 flex flex-col gap-3 border-t border-slate-800 pt-6 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 AI Facebook Poster / iM Sticker Poster</div>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-200">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-200">
              Terms
            </Link>
            <Link href="/data-deletion" className="hover:text-slate-200">
              Data Deletion
            </Link>
          </div>
        </footer>
      </section>
    </main>
  );
}
