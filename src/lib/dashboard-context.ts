import { cache } from "react";

import { ensureDefaultWorkspace } from "@/lib/workspace";
import { getSessionResult } from "@/lib/session";

export const getDashboardContext = cache(async () => {
  const sessionResult = await getSessionResult();

  if (sessionResult.error) {
    return {
      session: null,
      currentMembership: null,
      error: sessionResult.error,
    };
  }

  if (!sessionResult.session) {
    return {
      session: null,
      currentMembership: null,
      error: null,
    };
  }

  try {
    const currentMembership = await ensureDefaultWorkspace(
      sessionResult.session.user,
    );

    return {
      session: sessionResult.session,
      currentMembership,
      error: null,
    };
  } catch (error) {
    console.error("Failed to load dashboard context:", error);

    return {
      session: sessionResult.session,
      currentMembership: null,
      error,
    };
  }
});
