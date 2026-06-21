import { NextResponse } from "next/server";

import { generatePantipTeaserWithGemini } from "@/lib/ai/gemini";
import { getSessionResult } from "@/lib/session";
import {
  getPantipUrlErrorMessage,
  normalizePantipTopicUrl,
} from "@/lib/pantip/url";
import { createPantipPreviewSnapshot } from "@/lib/pantip/screenshot";
import {
  ensureDefaultWorkspace,
  ensureDefaultWritingProfile,
} from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PreviewRequestBody = {
  sourceUrl?: unknown;
  styleInstructions?: unknown;
};

function getReadableError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function logPreviewStage(stage: string, startedAt: number, extra?: Record<string, unknown>) {
  console.info("[pantip-preview]", {
    stage,
    elapsedMs: Date.now() - startedAt,
    ...extra,
  });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  let stage = "start";
  logPreviewStage(stage, startedAt);

  stage = "session";
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    return NextResponse.json(
      { ok: false, error: "อ่าน session ไม่สำเร็จ กรุณาลองโหลดหน้าใหม่" },
      { status: 500 },
    );
  }

  if (!sessionResult.session) {
    return NextResponse.json(
      { ok: false, error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as PreviewRequestBody | null;
  const sourceUrlValue = typeof body?.sourceUrl === "string" ? body.sourceUrl : "";
  const styleInstructions =
    typeof body?.styleInstructions === "string"
      ? body.styleInstructions.trim().slice(0, 800)
      : "";
  const normalizedUrl = normalizePantipTopicUrl(sourceUrlValue);

  if (!normalizedUrl.ok) {
    return NextResponse.json(
      { ok: false, error: getPantipUrlErrorMessage(normalizedUrl.error) },
      { status: 400 },
    );
  }

  try {
    stage = "workspace";
    logPreviewStage(stage, startedAt, { topicId: normalizedUrl.topicId });
    const currentMembership = await ensureDefaultWorkspace(
      sessionResult.session.user,
    );
    const writingProfile = await ensureDefaultWritingProfile(
      currentMembership.workspaceId,
    );

    stage = "screenshot";
    logPreviewStage(stage, startedAt, { topicId: normalizedUrl.topicId });
    const snapshot = await createPantipPreviewSnapshot(normalizedUrl.sourceUrl);

    stage = "caption";
    logPreviewStage(stage, startedAt, { topicId: normalizedUrl.topicId });
    const captionResult = await generatePantipTeaserWithGemini({
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      sourceUrl: snapshot.sourceUrl,
      styleInstructions,
      writingProfile,
    });

    stage = "success";
    logPreviewStage(stage, startedAt, { topicId: normalizedUrl.topicId });

    return NextResponse.json({
      ok: true,
      sourceUrl: snapshot.sourceUrl,
      topicId: normalizedUrl.topicId,
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      screenshotDataUrl: snapshot.screenshotDataUrl,
      screenshotMimeType: snapshot.screenshotMimeType,
      caption: captionResult.content,
      warnings: snapshot.warnings,
    });
  } catch (error) {
    console.error("Failed to create Pantip preview:", {
      stage,
      elapsedMs: Date.now() - startedAt,
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          "สร้างตัวอย่างจาก Pantip ไม่สำเร็จ กรุณาตรวจลิงก์ ลองใหม่อีกครั้ง หรือทดสอบบน Vercel production",
        technicalMessage: `stage=${stage}; elapsedMs=${Date.now() - startedAt}; ${getReadableError(error)}`,
      },
      { status: 500 },
    );
  }
}
