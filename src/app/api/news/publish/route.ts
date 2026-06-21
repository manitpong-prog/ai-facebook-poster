import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { facebookPages } from "@/db/schema";
import { buildFacebookPostUrl, publishTextToFacebookPage } from "@/lib/facebook";
import { getSessionResult } from "@/lib/session";
import { ensureDefaultWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PublishRequestBody = {
  caption?: unknown;
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

function validateHttpUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.toString();
  } catch {
    return "";
  }
}

function normalizeCaption(caption: string, sourceUrl: string) {
  const trimmedCaption = caption.trim();

  if (trimmedCaption.length < 20) {
    throw new Error("กรุณาใส่ caption อย่างน้อย 20 ตัวอักษร");
  }

  if (trimmedCaption.includes(sourceUrl)) {
    return trimmedCaption;
  }

  return `${trimmedCaption}\n\nอ่านต่อ: ${sourceUrl}`;
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
  const captionValue = typeof body?.caption === "string" ? body.caption : "";
  const sourceUrl = validateHttpUrl(
    typeof body?.sourceUrl === "string" ? body.sourceUrl.trim() : "",
  );

  if (!sourceUrl) {
    return NextResponse.json(
      { ok: false, error: "ลิงก์ข่าวไม่ถูกต้อง" },
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

    const message = normalizeCaption(captionValue, sourceUrl);
    const result = await publishTextToFacebookPage({
      pageId: savedPage.pageId,
      pageAccessToken: savedPage.accessTokenEncrypted,
      message,
    });
    const facebookPostUrl = result.permalinkUrl || buildFacebookPostUrl(result.id);

    return NextResponse.json({
      ok: true,
      facebookPostId: result.id,
      facebookPostUrl,
    });
  } catch (error) {
    console.error("Failed to publish news source post:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          "โพสต์ข่าวไป Facebook ไม่สำเร็จ กรุณาเช็ก Page Access Token, permission หรือสถานะ Meta App แล้วลองใหม่",
        technicalMessage: getReadableError(error),
      },
      { status: 500 },
    );
  }
}
