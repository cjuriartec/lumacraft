import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import {
  ACCOUNT_AI_SECRET_ALGORITHM,
  ACCOUNT_AI_SECRET_VERSION,
  AccountAIEncryptedSecretEnvelope,
} from "../../domain/types/account-ai-settings.types";

const AUTH_TAG_BYTES = 16;
const IV_BYTES = 12;

function toBase64Url(value: Buffer): string {
  return value.toString("base64").replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  return Buffer.from(`${normalized}${padding}`, "base64");
}

function getMasterKey(env: NodeJS.ProcessEnv): Result<Buffer, DomainError> {
  const rawKey = env.AI_SETTINGS_MASTER_KEY?.trim();

  if (!rawKey) {
    return fail(
      new DomainError("Missing AI_SETTINGS_MASTER_KEY", "AI_SETTINGS_MASTER_KEY_MISSING"),
    );
  }

  return ok(createHash("sha256").update(rawKey).digest());
}

export function encryptSecret(
  plaintext: string,
  env: NodeJS.ProcessEnv = process.env,
): Result<AccountAIEncryptedSecretEnvelope, DomainError> {
  if (!plaintext.trim()) {
    return fail(new DomainError("Cannot encrypt an empty secret", "AI_SECRET_EMPTY"));
  }

  const masterKeyResult = getMasterKey(env);
  if (!masterKeyResult.ok) {
    return masterKeyResult;
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ACCOUNT_AI_SECRET_ALGORITHM, masterKeyResult.value, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  if (tag.length !== AUTH_TAG_BYTES) {
    return fail(new DomainError("Invalid AES-GCM auth tag length", "AI_SECRET_ENCRYPTION_FAILED"));
  }

  return ok({
    algorithm: ACCOUNT_AI_SECRET_ALGORITHM,
    version: ACCOUNT_AI_SECRET_VERSION,
    iv: toBase64Url(iv),
    tag: toBase64Url(tag),
    ciphertext: toBase64Url(ciphertext),
    last4: plaintext.slice(-4),
    updatedAt: new Date().toISOString(),
  });
}

export function decryptSecret(
  payload: AccountAIEncryptedSecretEnvelope,
  env: NodeJS.ProcessEnv = process.env,
): Result<string, DomainError> {
  const masterKeyResult = getMasterKey(env);
  if (!masterKeyResult.ok) {
    return masterKeyResult;
  }

  if (
    payload.algorithm !== ACCOUNT_AI_SECRET_ALGORITHM ||
    payload.version !== ACCOUNT_AI_SECRET_VERSION
  ) {
    return fail(
      new DomainError(
        "Unsupported account AI secret envelope version",
        "AI_SECRET_VERSION_NOT_SUPPORTED",
      ),
    );
  }

  try {
    const decipher = createDecipheriv(
      payload.algorithm,
      masterKeyResult.value,
      fromBase64Url(payload.iv),
    );
    decipher.setAuthTag(fromBase64Url(payload.tag));

    const plaintext = Buffer.concat([
      decipher.update(fromBase64Url(payload.ciphertext)),
      decipher.final(),
    ]).toString("utf8");

    return ok(plaintext);
  } catch {
    return fail(
      new DomainError(
        "Account AI secret payload is invalid or has been tampered with",
        "AI_SECRET_DECRYPTION_FAILED",
      ),
    );
  }
}
