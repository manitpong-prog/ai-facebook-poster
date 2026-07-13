import { NextResponse } from "next/server";

import {
  generateNewsSourcePostWithGemini,
  type NewsPostMode,
} from "@/lib/ai/gemini";
import { getSessionResult } from "@/lib/session";
import { fetchNewsArticleContent } from "@/lib/news/rss";
import {
  ensureDefaultWorkspace,
  ensureDefaultWritingProfile,
} from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type PreviewRequestBody = {
  sourceName?: unknown;
  title?: unknown;
  summary?: unknown;
  sourceUrl?: unknown;
  postMode?: unknown;
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

function normalizeBodyString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}


function normalizePostMode(value: unknown): NewsPostMode {
  if (value === "short" || value === "sports" || value === "story") {
    return value;
  }

  return "story";
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
  const sourceName = normalizeBodyString(body?.sourceName, 120) || "News Source";
  const title = normalizeBodyString(body?.title, 260);
  const summary = normalizeBodyString(body?.summary, 1200);
  const sourceUrl = validateHttpUrl(normalizeBodyString(body?.sourceUrl, 1200));
  const postMode = normalizePostMode(body?.postMode);
  const styleInstructions = normalizeBodyString(body?.styleInstructions, 800);

  if (!sourceUrl) {
    return NextResponse.json(
      { ok: false, error: "ลิงก์ข่าวไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  if (!title) {
    return NextResponse.json(
      { ok: false, error: "ข่าวนี้ไม่มีหัวข้อ กรุณาเลือกข่าวอื่น" },
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
    const article = await fetchNewsArticleContent({
      title,
      summary,
      sourceUrl,
    });
    const captionResult = await generateNewsSourcePostWithGemini({
      workspaceId: currentMembership.workspaceId,
      sourceName,
      title: article.title || title,
      summary: article.summary || summary,
      articleText: article.articleText,
      sourceUrl: article.sourceUrl,
      postMode,
      styleInstructions,
      writingProfile,
    });

    return NextResponse.json({
      ok: true,
      sourceName,
      title: article.title || title,
      summary: article.summary || summary,
      articleTextPreview: article.articleText.slice(0, 1200),
      sourceUrl: article.sourceUrl,
      postMode,
      caption: captionResult.content,
      aiUsage: {
        model: captionResult.model,
        inputTokens: captionResult.inputTokens,
        outputTokens: captionResult.outputTokens,
        totalTokens: captionResult.totalTokens,
      },
    });
  } catch (error) {
    console.error("Failed to create news source preview:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "สร้างตัวอย่างโพสต์ข่าวไม่สำเร็จ กรุณาเลือกข่าวอื่นหรือลองใหม่อีกครั้ง",
        technicalMessage: getReadableError(error),
      },
      { status: 500 },
    );
  }
}
