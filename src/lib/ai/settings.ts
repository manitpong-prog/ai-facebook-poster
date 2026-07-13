import { eq } from "drizzle-orm";

import { db } from "@/db";
import { workspaceAiSettings } from "@/db/schema";
import {
  decryptSecret,
  encryptSecret,
  getEncryptionConfigurationError,
} from "@/lib/encryption";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

const NON_TEXT_MODEL_MARKERS = [
  "embedding",
  "imagen",
  "image",
  "tts",
  "live",
  "veo",
  "lyria",
];

const GEMINI_ENCRYPTION_VERSION = 1;

type SaveWorkspaceGeminiSettingsInput = {
  workspaceId: string;
  userId: string;
  apiKey?: string | null;
  model?: string | null;
  testedAt?: Date | null;
};

type ResolveGeminiConfigurationInput = {
  apiKeyOverride?: string | null;
  modelOverride?: string | null;
};

function getEncryptionContext(workspaceId: string) {
  return `workspace:${workspaceId}:gemini-api-key:v${GEMINI_ENCRYPTION_VERSION}`;
}

function normalizeModel(value: string | null | undefined) {
  return value?.trim().slice(0, 120) || null;
}

export function getGeminiTextModelValidationError(
  value: string | null | undefined,
) {
  const model = normalizeModel(value);

  if (!model) {
    return null;
  }

  const normalized = model.toLowerCase();
  const unsupportedMarker = NON_TEXT_MODEL_MARKERS.find((marker) =>
    normalized.includes(marker),
  );

  if (unsupportedMarker) {
    return `โมเดล ${model} ไม่ใช่โมเดลสร้างข้อความสำหรับโพสต์ กรุณาใช้ gemini-2.5-flash-lite หรือ gemini-2.5-flash`;
  }

  if (!normalized.startsWith("gemini-")) {
    return `ชื่อโมเดล ${model} ไม่ถูกต้อง กรุณาใช้ชื่อที่ขึ้นต้นด้วย gemini-`;
  }

  return null;
}

function normalizeApiKey(value: string | null | undefined) {
  return value?.replace(/\s+/g, "").trim() || null;
}

function maskApiKey(value: string) {
  if (value.length <= 8) {
    return "ตั้งค่าแล้ว";
  }

  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

export async function getWorkspaceGeminiSettings(workspaceId: string) {
  const [settings] = await db
    .select()
    .from(workspaceAiSettings)
    .where(eq(workspaceAiSettings.workspaceId, workspaceId))
    .limit(1);

  return settings ?? null;
}

export async function getGeminiSettingsSummary(workspaceId: string) {
  const settings = await getWorkspaceGeminiSettings(workspaceId);
  const environmentApiKey = normalizeApiKey(process.env.GEMINI_API_KEY);
  const hasWorkspaceKey = Boolean(
    settings?.apiKeyEncrypted && settings.apiKeyIv && settings.apiKeyAuthTag,
  );
  const encryptionError = hasWorkspaceKey
    ? getEncryptionConfigurationError()
    : null;
  const source = hasWorkspaceKey
    ? "workspace"
    : environmentApiKey
      ? "environment"
      : "missing";
  const model =
    normalizeModel(settings?.model) ||
    normalizeModel(process.env.GEMINI_MODEL) ||
    DEFAULT_GEMINI_MODEL;

  return {
    source,
    hasWorkspaceKey,
    hasEnvironmentFallback: Boolean(environmentApiKey),
    hasUsableApiKey:
      source === "workspace" ? !encryptionError : source === "environment",
    maskedApiKey:
      source === "workspace"
        ? `••••••••${settings?.apiKeyLastFour ?? "????"}`
        : environmentApiKey
          ? maskApiKey(environmentApiKey)
          : "ยังไม่ได้ตั้งค่า",
    model,
    encryptionReady: !getEncryptionConfigurationError(),
    encryptionError: getEncryptionConfigurationError(),
    updatedAt: settings?.updatedAt ?? null,
    lastTestedAt: settings?.lastTestedAt ?? null,
  } as const;
}

export async function resolveGeminiConfiguration(
  workspaceId: string,
  overrides: ResolveGeminiConfigurationInput = {},
) {
  const settings = await getWorkspaceGeminiSettings(workspaceId);
  const overrideApiKey = normalizeApiKey(overrides.apiKeyOverride);
  const model =
    normalizeModel(overrides.modelOverride) ||
    normalizeModel(settings?.model) ||
    normalizeModel(process.env.GEMINI_MODEL) ||
    DEFAULT_GEMINI_MODEL;

  if (overrideApiKey) {
    return {
      apiKey: overrideApiKey,
      model,
      source: "override" as const,
    };
  }

  if (
    settings?.apiKeyEncrypted &&
    settings.apiKeyIv &&
    settings.apiKeyAuthTag
  ) {
    const apiKey = decryptSecret(
      {
        ciphertext: settings.apiKeyEncrypted,
        iv: settings.apiKeyIv,
        authTag: settings.apiKeyAuthTag,
      },
      getEncryptionContext(workspaceId),
    );

    return {
      apiKey,
      model,
      source: "workspace" as const,
    };
  }

  const environmentApiKey = normalizeApiKey(process.env.GEMINI_API_KEY);

  if (!environmentApiKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า Gemini API Key ในหน้า AI Settings หรือ GEMINI_API_KEY บนเซิร์ฟเวอร์",
    );
  }

  return {
    apiKey: environmentApiKey,
    model,
    source: "environment" as const,
  };
}

export async function saveWorkspaceGeminiSettings({
  workspaceId,
  userId,
  apiKey,
  model,
  testedAt,
}: SaveWorkspaceGeminiSettingsInput) {
  const normalizedApiKey = normalizeApiKey(apiKey);
  const normalizedModel = normalizeModel(model) || DEFAULT_GEMINI_MODEL;
  const encrypted = normalizedApiKey
    ? encryptSecret(normalizedApiKey, getEncryptionContext(workspaceId))
    : null;
  const now = new Date();

  await db
    .insert(workspaceAiSettings)
    .values({
      workspaceId,
      provider: "gemini",
      model: normalizedModel,
      apiKeyEncrypted: encrypted?.ciphertext ?? null,
      apiKeyIv: encrypted?.iv ?? null,
      apiKeyAuthTag: encrypted?.authTag ?? null,
      apiKeyLastFour: normalizedApiKey?.slice(-4) ?? null,
      encryptionVersion: GEMINI_ENCRYPTION_VERSION,
      lastTestedAt: testedAt ?? null,
      updatedByUserId: userId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: workspaceAiSettings.workspaceId,
      set: {
        model: normalizedModel,
        ...(encrypted
          ? {
              apiKeyEncrypted: encrypted.ciphertext,
              apiKeyIv: encrypted.iv,
              apiKeyAuthTag: encrypted.authTag,
              apiKeyLastFour: normalizedApiKey?.slice(-4) ?? null,
              encryptionVersion: GEMINI_ENCRYPTION_VERSION,
            }
          : {}),
        ...(testedAt ? { lastTestedAt: testedAt } : {}),
        updatedByUserId: userId,
        updatedAt: now,
      },
    });
}

export async function markWorkspaceGeminiKeyTested(workspaceId: string) {
  await db
    .update(workspaceAiSettings)
    .set({
      lastTestedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workspaceAiSettings.workspaceId, workspaceId));
}

export async function deleteWorkspaceGeminiApiKey(
  workspaceId: string,
  userId: string,
) {
  await db
    .update(workspaceAiSettings)
    .set({
      apiKeyEncrypted: null,
      apiKeyIv: null,
      apiKeyAuthTag: null,
      apiKeyLastFour: null,
      lastTestedAt: null,
      updatedByUserId: userId,
      updatedAt: new Date(),
    })
    .where(eq(workspaceAiSettings.workspaceId, workspaceId));
}

export async function revealEffectiveGeminiApiKey(workspaceId: string) {
  const configuration = await resolveGeminiConfiguration(workspaceId);

  return {
    apiKey: configuration.apiKey,
    source: configuration.source,
  };
}
