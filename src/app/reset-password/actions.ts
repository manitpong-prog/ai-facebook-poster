"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const params = new URLSearchParams();

  if (token) {
    params.set("token", token);
  }

  if (!token) {
    params.set("error", "missing_token");
    redirect(`/reset-password?${params.toString()}`);
  }

  if (newPassword.length < 8) {
    params.set("error", "password_too_short");
    redirect(`/reset-password?${params.toString()}`);
  }

  if (newPassword !== confirmPassword) {
    params.set("error", "password_mismatch");
    redirect(`/reset-password?${params.toString()}`);
  }

  try {
    await auth.api.resetPassword({
      body: {
        token,
        newPassword,
      },
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    params.set("error", "reset_failed");
    redirect(`/reset-password?${params.toString()}`);
  }

  redirect("/login?reset=success");
}
