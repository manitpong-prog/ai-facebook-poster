import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function decodeEncryptionKey(rawValue: string) {
  const value = rawValue.trim();

  if (!value) {
    throw new Error("APP_ENCRYPTION_KEY is not set");
  }

  const key = /^[0-9a-f]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");

  if (key.length !== 32) {
    throw new Error(
      "APP_ENCRYPTION_KEY must decode to exactly 32 bytes (64 hex characters or a 32-byte base64 value)",
    );
  }

  return key;
}

function getEncryptionKey() {
  return decodeEncryptionKey(process.env.APP_ENCRYPTION_KEY ?? "");
}

export function getEncryptionConfigurationError() {
  try {
    getEncryptionKey();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid APP_ENCRYPTION_KEY";
  }
}

export function encryptSecret(
  plaintext: string,
  context: string,
): EncryptedSecret {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(
  encryptedSecret: EncryptedSecret,
  context: string,
) {
  const key = getEncryptionKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encryptedSecret.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(encryptedSecret.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedSecret.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
