"use client";

import { useState } from "react";

type ApiKeyDisplayProps = {
  apiKey: string;
  sourceLabel: string;
};

export function ApiKeyDisplay({ apiKey, sourceLabel }: ApiKeyDisplayProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function copyApiKey() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-blue-100">
            คีย์ที่กำลังใช้งานจริง
          </div>
          <div className="mt-1 text-xs text-blue-100/70">{sourceLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setIsVisible((value) => !value)}
          className="rounded-lg border border-blue-300/30 px-3 py-2 text-xs font-semibold text-blue-50 hover:bg-blue-400/10"
        >
          {isVisible ? "ซ่อนคีย์" : "แสดงคีย์"}
        </button>
      </div>

      <input
        type={isVisible ? "text" : "password"}
        readOnly
        value={apiKey}
        spellCheck={false}
        className="mt-4 w-full rounded-xl border border-blue-300/20 bg-slate-950 px-4 py-3 font-mono text-xs leading-5 text-white outline-none"
        aria-label="Gemini API Key ที่กำลังใช้งาน"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copyApiKey}
          className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-400"
        >
          คัดลอกคีย์
        </button>
        <span className="text-xs text-blue-100/75" aria-live="polite">
          {copyStatus === "copied"
            ? "คัดลอกแล้ว"
            : copyStatus === "failed"
              ? "คัดลอกอัตโนมัติไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกเอง"
              : "คีย์เต็มจะแสดงเฉพาะเมื่อเปิดหน้านี้ด้วยปุ่มแสดงคีย์"}
        </span>
      </div>
    </div>
  );
}
