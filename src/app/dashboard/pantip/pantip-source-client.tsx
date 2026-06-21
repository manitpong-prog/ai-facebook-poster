"use client";

import { useState } from "react";

import type { PantipRiskWarning } from "@/lib/pantip/risk";

type PantipPreviewResponse = {
  ok: true;
  sourceUrl: string;
  topicId: string;
  title: string;
  excerpt: string;
  screenshotDataUrl: string;
  screenshotMimeType: string;
  imageMode: "pantip_screenshot" | "readable_card";
  caption: string;
  warnings: PantipRiskWarning[];
};

type ApiErrorResponse = {
  ok: false;
  error: string;
  technicalMessage?: string;
};

type PublishSuccessResponse = {
  ok: true;
  facebookPostId: string;
  facebookPhotoId: string;
  facebookPostUrl: string;
};

type PantipSourceClientProps = {
  hasConnectedFacebookPage: boolean;
  facebookPageLabel: string;
};

type LoadingState = "idle" | "preview" | "publish";

async function readApiResponse<TSuccess extends { ok: true }>(response: Response) {
  const rawText = await response.text().catch(() => "");
  let payload: TSuccess | ApiErrorResponse | null = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as TSuccess | ApiErrorResponse;
    } catch {
      payload = null;
    }
  }

  if (!response.ok || !payload || payload.ok === false) {
    const errorPayload = payload as ApiErrorResponse | null;

    if (errorPayload?.technicalMessage) {
      throw new Error(`${errorPayload.error}

รายละเอียด: ${errorPayload.technicalMessage}`);
    }

    if (errorPayload?.error) {
      throw new Error(errorPayload.error);
    }

    const textPreview = rawText
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 700);
    const statusDetail = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;

    throw new Error(
      textPreview
        ? `Request failed (${statusDetail})

รายละเอียดจาก server: ${textPreview}`
        : `Request failed (${statusDetail}) โดย server ไม่ได้ส่งรายละเอียดกลับมา กรุณาดู Runtime Logs ใน Vercel`,
    );
  }

  return payload as TSuccess;
}

export function PantipSourceClient({
  hasConnectedFacebookPage,
  facebookPageLabel,
}: PantipSourceClientProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [preview, setPreview] = useState<PantipPreviewResponse | null>(null);
  const [caption, setCaption] = useState("");
  const [styleInstructions, setStyleInstructions] = useState(
    "ใช้ข้อความตัวอย่างเป็นฐาน แล้วเพิ่มสรุปหรือมุมชวนคิดสั้น ๆ อีก 1-2 ประโยค ให้เหมือนผมหยิบกระทู้นี้มาเล่าเอง ไม่ต้องเป็นทางการ ไม่ต้องยาว",
  );
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successResult, setSuccessResult] = useState<PublishSuccessResponse | null>(
    null,
  );

  const isBusy = loadingState !== "idle";

  async function createPreview() {
    setErrorMessage("");
    setSuccessResult(null);
    setPreview(null);
    setCaption("");
    setLoadingState("preview");

    try {
      const result = await fetch("/api/pantip/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sourceUrl, styleInstructions }),
      });
      const payload = await readApiResponse<PantipPreviewResponse>(result);

      setPreview(payload);
      setCaption(payload.caption);
      setSourceUrl(payload.sourceUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoadingState("idle");
    }
  }

  async function publishToFacebook() {
    if (!preview) {
      return;
    }

    setErrorMessage("");
    setSuccessResult(null);
    setLoadingState("publish");

    try {
      const result = await fetch("/api/pantip/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceUrl: preview.sourceUrl,
          caption,
          screenshotDataUrl: preview.screenshotDataUrl,
        }),
      });
      const payload = await readApiResponse<PublishSuccessResponse>(result);

      setSuccessResult(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoadingState("idle");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">ใส่ลิงก์กระทู้ Pantip</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              ระบบนี้เป็นแบบกดเองเท่านั้น: ใส่ลิงก์หนึ่งกระทู้ สร้าง preview ตรวจเอง แล้วค่อยกดโพสต์ลง Facebook Page
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
            Facebook Page: <span className="font-semibold text-white">{facebookPageLabel}</span>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block text-sm font-medium text-slate-200" htmlFor="pantip-url">
            ลิงก์ Pantip
          </label>
          <input
            id="pantip-url"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://pantip.com/topic/12345678"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
            disabled={isBusy}
          />
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <label className="block text-sm font-medium text-slate-200" htmlFor="pantip-style">
              สไตล์แคปชั่นรอบนี้
            </label>
            <textarea
              id="pantip-style"
              value={styleInstructions}
              onChange={(event) => setStyleInstructions(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
              disabled={isBusy}
            />
            <p className="text-xs leading-5 text-slate-500">
              ระบบยังใช้ Writing Style หลักของเพจด้วย ช่องนี้ใช้ปรับเฉพาะโพสต์ Pantip รอบนี้ เช่น อยากให้สั้นลง เหมือนเราเขียนเอง หรือไม่เป็นทางการ
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={createPreview}
              disabled={isBusy}
              className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loadingState === "preview" ? "กำลังสร้างตัวอย่าง..." : "สร้างตัวอย่างโพสต์"}
            </button>
            <p className="text-xs leading-5 text-slate-500">
              ระบบจะสร้างภาพการ์ดอ่านง่ายจากหัวข้อ + ตัวอย่างข้อความสั้น ๆ + ลิงก์ต้นทาง โดยไม่ใช้เมนูหรือ footer ของ Pantip
            </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="whitespace-pre-wrap rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {successResult ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
          <p className="font-semibold">โพสต์ลง Facebook Page สำเร็จแล้ว</p>
          <p className="mt-1 text-emerald-200">Facebook Post ID: {successResult.facebookPostId}</p>
          {successResult.facebookPostUrl ? (
            <a
              href={successResult.facebookPostUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-emerald-100 underline underline-offset-4"
            >
              เปิดโพสต์บน Facebook
            </a>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Preview การ์ดกระทู้</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {preview.imageMode === "readable_card"
                    ? "ระบบใช้การ์ดอ่านง่ายจากหัวข้อและข้อความตัวอย่างของกระทู้โดยตรง ไม่ใช้ภาพหน้าเว็บ Pantip จริง"
                     : "ระบบจะใช้รูปนี้โพสต์ขึ้น Facebook โดยตรง เป็นภาพการ์ดอ่านง่าย แล้วไม่เก็บรูปไว้ในแอป"}
                </p>
              </div>
              <a
                href={preview.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-300 underline underline-offset-4"
              >
                เปิดต้นทาง
              </a>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.screenshotDataUrl}
              alt={`Pantip snapshot: ${preview.title}`}
              className="mx-auto w-full max-w-[430px] rounded-2xl border border-slate-700 bg-slate-950 object-contain"
            />
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Caption จาก AI</h2>
              <p className="mt-1 text-xs text-slate-500">แก้ข้อความได้ก่อนกดโพสต์ ระบบจะพยายามให้ข้อความสั้นใกล้เคียง “ตัวอย่างข้อความสั้น ๆ” และบังคับใส่ลิงก์ต้นทางเสมอ</p>
              <textarea
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={7}
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
                disabled={isBusy}
              />
              <button
                type="button"
                onClick={publishToFacebook}
                disabled={!hasConnectedFacebookPage || isBusy}
                className="mt-4 w-full rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {loadingState === "publish" ? "กำลังโพสต์ลง Facebook..." : "โพสต์ลง Facebook Page"}
              </button>
              {!hasConnectedFacebookPage ? (
                <p className="mt-3 text-xs text-amber-200">
                  ยังไม่ได้เชื่อม Facebook Page กรุณาไปตั้งค่าหน้า Facebook Page ก่อน
                </p>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h3 className="font-semibold text-slate-100">ข้อมูลที่อ่านได้จากกระทู้</h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">หัวข้อ</dt>
                  <dd className="mt-1 leading-6 text-slate-200">{preview.title}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">ตัวอย่างข้อความสั้น ๆ</dt>
                  <dd className="mt-1 leading-6 text-slate-300">{preview.excerpt}</dd>
                </div>
              </dl>
            </div>

            {preview.warnings.length > 0 ? (
              <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
                <h3 className="font-semibold">คำเตือนก่อนโพสต์</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {preview.warnings.map((warning) => (
                    <li key={warning.code}>{warning.message}</li>
                  ))}
                </ul>
                <p className="mt-3 text-amber-200">
                  ถ้ากระทู้มีข้อมูลส่วนตัว คำกล่าวหา หรือพาดพิงบุคคลจริง แนะนำให้ข้ามและไม่โพสต์
                </p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
