import { NextResponse } from "next/server";

import { getSessionResult } from "@/lib/session";
import { fetchNewsFeed, resolveNewsSource } from "@/lib/news/rss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const sourceId = url.searchParams.get("sourceId") || undefined;
  const customRssUrl = url.searchParams.get("rssUrl") || undefined;
  const customSourceName = url.searchParams.get("sourceName") || undefined;

  try {
    const source = resolveNewsSource({
      sourceId,
      customRssUrl,
      customSourceName,
    });
    const items = await fetchNewsFeed(source);

    return NextResponse.json({
      ok: true,
      source,
      items,
    });
  } catch (error) {
    console.error("Failed to fetch news feed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "โหลด RSS ข่าวไม่สำเร็จ กรุณาเลือกแหล่งข่าวอื่นหรือลองใหม่อีกครั้ง",
        technicalMessage: getReadableError(error),
      },
      { status: 500 },
    );
  }
}
