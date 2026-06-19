import { NextRequest, NextResponse } from "next/server";

import { runDueAutoPilotJobs } from "@/lib/auto-pilot";
import { publishDueScheduledPosts } from "@/lib/scheduled-publisher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CronAuthResult =
  | {
      authorized: true;
      mode: "authorization-header" | "secret-query" | "local-dev-no-secret";
    }
  | {
      authorized: false;
      reason: string;
    };

function getCronAuthResult(request: NextRequest): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    if (process.env.NODE_ENV !== "production") {
      return { authorized: true, mode: "local-dev-no-secret" };
    }

    return {
      authorized: false,
      reason:
        "CRON_SECRET is not configured. Set CRON_SECRET before enabling production cron jobs.",
    };
  }

  const authorization = request.headers.get("authorization")?.trim();
  const secretFromQuery = request.nextUrl.searchParams.get("secret")?.trim();

  if (authorization === `Bearer ${cronSecret}`) {
    return { authorized: true, mode: "authorization-header" };
  }

  if (secretFromQuery === cronSecret) {
    return { authorized: true, mode: "secret-query" };
  }

  return {
    authorized: false,
    reason:
      "Invalid cron secret. Use Authorization: Bearer <CRON_SECRET> or ?secret=<CRON_SECRET>.",
  };
}

function getNumberParam(request: NextRequest, key: string) {
  const rawLimit = request.nextUrl.searchParams.get(key);

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
  const auth = getCronAuthResult(request);

  if (!auth.authorized) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized cron request.",
        reason: auth.reason,
      },
      { status: 401 },
    );
  }

  try {
    const skipAutoPilot = request.nextUrl.searchParams.get("skipAutoPilot") === "1";
    const autoPilotResult = skipAutoPilot
      ? null
      : await runDueAutoPilotJobs({
          limit: getNumberParam(request, "autoPilotLimit"),
        });

    const scheduledPublishResult = await publishDueScheduledPosts({
      limit: getNumberParam(request, "limit"),
    });

    const ok = (autoPilotResult?.ok ?? true) && scheduledPublishResult.ok;

    return NextResponse.json(
      {
        ok,
        authMode: auth.mode,
        autoPilot: autoPilotResult,
        scheduledPublish: scheduledPublishResult,
      },
      { status: ok ? 200 : 207 },
    );
  } catch (error) {
    console.error("Scheduled publish cron failed:", error);

    return NextResponse.json(
      {
        ok: false,
        authMode: auth.mode,
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
