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

export async function POST(request: Request) {
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
  const normalizedUrl = normalizePantipTopicUrl(sourceUrlValue);

  if (!normalizedUrl.ok) {
    return NextResponse.json(
      { ok: false, error: getPantipUrlErrorMessage(normalizedUrl.error) },
      { status: 400 },
    );
  }

  try {
    const currentMembership = await ensureDefaultWorkspace(
      sessionResult.session.user,
    );
    const writingProfile = await ensureDefaultWritingProfile(
      currentMembership.workspaceId,
    );
    const snapshot = await createPantipPreviewSnapshot(normalizedUrl.sourceUrl);
    const captionResult = await generatePantipTeaserWithGemini({
      title: snapshot.title,
      excerpt: snapshot.excerpt,
      sourceUrl: snapshot.sourceUrl,
      writingProfile,
    });

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
    console.error("Failed to create Pantip preview:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          "สร้างตัวอย่างจาก Pantip ไม่สำเร็จ กรุณาตรวจลิงก์ ลองใหม่อีกครั้ง หรือทดสอบบน Vercel production",
        technicalMessage: getReadableError(error),
      },
      { status: 500 },
    );
  }
}
