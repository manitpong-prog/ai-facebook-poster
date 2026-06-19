import { NextRequest, NextResponse } from "next/server";

import { publishDueScheduledPosts } from "@/lib/scheduled-publisher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization")?.trim();
  const secretFromQuery = request.nextUrl.searchParams.get("secret")?.trim();

  return (
    authorization === `Bearer ${cronSecret}` || secretFromQuery === cronSecret
  );
}

function getLimit(request: NextRequest) {
  const rawLimit = request.nextUrl.searchParams.get("limit");

  if (!rawLimit) {
    return undefined;
  }

  const parsed = Number(rawLimit);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

async function handlePublishScheduled(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unauthorized cron request. Set CRON_SECRET and call with Authorization: Bearer <CRON_SECRET>.",
      },
      { status: 401 },
    );
  }

  try {
    const result = await publishDueScheduledPosts({ limit: getLimit(request) });
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error) {
    console.error("Scheduled publish cron failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Scheduled publish cron failed.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePublishScheduled(request);
}

export async function POST(request: NextRequest) {
  return handlePublishScheduled(request);
}
