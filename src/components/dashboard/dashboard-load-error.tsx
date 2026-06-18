type DashboardLoadErrorProps = {
  title?: string;
  message?: string;
  technicalMessage?: string;
};

export function DashboardLoadError({
  title = "โหลดข้อมูลไม่สำเร็จ",
  message = "ระบบเชื่อมต่อฐานข้อมูลหรือข้อมูลผู้ใช้ไม่สำเร็จชั่วคราว กรุณาลองโหลดหน้านี้ใหม่อีกครั้ง",
  technicalMessage,
}: DashboardLoadErrorProps) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-xl">
        <p className="text-sm font-semibold text-red-200">Connection Error</p>
        <h1 className="mt-2 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-red-100">{message}</p>

        {technicalMessage ? (
          <pre className="mt-5 max-h-48 overflow-auto rounded-xl border border-red-500/20 bg-slate-950 p-4 text-xs leading-5 text-red-100">
            {technicalMessage}
          </pre>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href=""
            className="rounded-xl bg-red-400 px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-red-300"
          >
            ลองโหลดหน้านี้ใหม่
          </a>
          <a
            href="/dashboard"
            className="rounded-xl border border-red-300/40 px-4 py-3 text-center text-sm font-semibold text-red-100 hover:bg-red-500/10"
          >
            กลับ Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
