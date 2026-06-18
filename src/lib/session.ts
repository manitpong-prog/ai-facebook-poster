import { headers } from "next/headers";
import { cache } from "react";

import { auth } from "@/lib/auth";

type AppSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type SessionResult =
  | {
      session: AppSession;
      error: null;
    }
  | {
      session: null;
      error: unknown;
    };

export const getSessionResult = cache(async (): Promise<SessionResult> => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return {
      session,
      error: null,
    };
  } catch (error) {
    console.error("Failed to load auth session:", error);

    return {
      session: null,
      error,
    };
  }
});

export function getSessionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "ไม่สามารถตรวจสอบสถานะการเข้าสู่ระบบได้ในตอนนี้";
}
