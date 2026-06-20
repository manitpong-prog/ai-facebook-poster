"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getPasswordResetDebugLink } from "@/lib/password-reset-email";

function getBaseUrl() {
  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();

  if (betterAuthUrl) {
    return betterAuthUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  let target = "/forgot-password?error=missing_email";

  if (email) {
    const params = new URLSearchParams({ sent: "1", email });

    try {
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo: `${getBaseUrl()}/reset-password`,
        },
      });

      const debugLink = getPasswordResetDebugLink(email);

      if (debugLink) {
        params.set("debugLink", debugLink);
      }
    } catch (error) {
      // Keep the user-facing response generic to avoid revealing whether an
      // email exists, but log the real issue for local/Vercel diagnostics.
      console.error("Failed to request password reset:", error);
      params.set("sent", "1");
    }

    target = `/forgot-password?${params.toString()}`;
  }

  redirect(target);
}
