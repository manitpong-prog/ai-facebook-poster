"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { writingProfiles } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  ensureDefaultWorkspace,
  ensureDefaultWritingProfile,
} from "@/lib/workspace";

function getTextValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function getMaxWords(formData: FormData) {
  const rawValue = Number(formData.get("maxWords"));

  if (!Number.isFinite(rawValue)) {
    return 300;
  }

  return Math.min(Math.max(Math.round(rawValue), 50), 1000);
}

export async function updateWritingStyleAction(formData: FormData) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentMembership = await ensureDefaultWorkspace(session.user);
  const profile = await ensureDefaultWritingProfile(
    currentMembership.workspaceId,
  );

  await db
    .update(writingProfiles)
    .set({
      name: getTextValue(formData, "name") || "สไตล์หลักของฉัน",
      tone: getTextValue(formData, "tone"),
      targetAudience: getTextValue(formData, "targetAudience"),
      rules: getTextValue(formData, "rules"),
      favoriteWords: getTextValue(formData, "favoriteWords"),
      bannedWords: getTextValue(formData, "bannedWords"),
      callToAction: getTextValue(formData, "callToAction"),
      samplePosts: getTextValue(formData, "samplePosts"),
      maxWords: getMaxWords(formData),
      isDefault: true,
      updatedAt: new Date(),
    })
    .where(eq(writingProfiles.id, profile.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/style");
  redirect("/dashboard/style?updated=1");
}
