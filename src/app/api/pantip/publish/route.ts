import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { facebookPages } from "@/db/schema";
import {
  buildFacebookPostUrl,
  publishPhotoToFacebookPage,
} from "@/lib/facebook";
import { parseImageDataUrl } from "@/lib/pantip/image-data";
import {
  getPantipUrlErrorMessage,
  normalizePantipTopicUrl,
} from "@/lib/pantip/url";
import { getSessionResult } from "@/lib/session";
import { ensureDefaultWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PublishRequestBody = {
  sourceUrl?: unknown;
  caption?: unknown;
  screenshotDataUrl?: unknown;
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

function normalizeCaption(caption: string, sourceUrl: string) {
  const trimmedCaption = caption.trim();

  if (trimmedCaption.length < 10) {
    throw new Error("กรุณาใส่ caption อย่างน้อย 10 ตัวอักษร");
  }

  if (trimmedCaption.includes(sourceUrl)) {
    return trimmedCaption;
  }

  return `${trimmedCaption}\n\nอ่านกระทู้ต้นทาง:\n${sourceUrl}`;
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

  const body = (await request.json().catch(() => null)) as PublishRequestBody | null;
  const sourceUrlValue = typeof body?.sourceUrl === "string" ? body.sourceUrl : "";
  const captionValue = typeof body?.caption === "string" ? body.caption : "";
  const imageDataUrl =
    typeof body?.screenshotDataUrl === "string" ? body.screenshotDataUrl : "";
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
    const [savedPage] = await db
      .select({
        id: facebookPages.id,
        pageId: facebookPages.pageId,
        accessTokenEncrypted: facebookPages.accessTokenEncrypted,
      })
      .from(facebookPages)
      .where(eq(facebookPages.workspaceId, currentMembership.workspaceId))
      .limit(1);

    if (!savedPage?.pageId || !savedPage.accessTokenEncrypted) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "ยังไม่ได้เชื่อม Facebook Page หรือยังไม่มี Page Access Token กรุณาไปตั้งค่า Facebook Page ก่อน",
        },
        { status: 400 },
      );
    }

    const caption = normalizeCaption(captionValue, normalizedUrl.sourceUrl);
    const image = parseImageDataUrl(imageDataUrl);
    const result = await publishPhotoToFacebookPage({
      pageId: savedPage.pageId,
      pageAccessToken: savedPage.accessTokenEncrypted,
      caption,
      imageBuffer: image.buffer,
      imageMimeType: image.mimeType,
      filename: `pantip-${normalizedUrl.topicId}.jpg`,
    });
    const facebookPostUrl =
      result.permalinkUrl || buildFacebookPostUrl(result.id || result.photoId);

    return NextResponse.json({
      ok: true,
      facebookPostId: result.id,
      facebookPhotoId: result.photoId,
      facebookPostUrl,
    });
  } catch (error) {
    console.error("Failed to publish Pantip post:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          "โพสต์รูปจาก Pantip ไป Facebook ไม่สำเร็จ กรุณาเช็ก Page Access Token, permission หรือสถานะ Meta App แล้วลองใหม่",
        technicalMessage: getReadableError(error),
      },
      { status: 500 },
    );
  }
}
