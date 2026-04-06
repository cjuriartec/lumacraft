import { describe, expect, it } from "vitest";

import {
  decryptSecret,
  encryptSecret,
} from "@/modules/ai/infrastructure/security/account-ai-settings-crypto";

describe("account-ai-settings-crypto", () => {
  const env = {
    AI_SETTINGS_MASTER_KEY: "test-master-key",
    NODE_ENV: "test",
  } as unknown as NodeJS.ProcessEnv;

  it("encrypts and decrypts secrets with AES-GCM", () => {
    const encrypted = encryptSecret("sk-test-1234", env);

    expect(encrypted.ok).toBe(true);
    if (!encrypted.ok) return;

    expect(encrypted.value.last4).toBe("1234");

    const decrypted = decryptSecret(encrypted.value, env);
    expect(decrypted.ok).toBe(true);
    if (!decrypted.ok) return;

    expect(decrypted.value).toBe("sk-test-1234");
  });

  it("detects tampered payloads", () => {
    const encrypted = encryptSecret("sk-test-1234", env);
    if (!encrypted.ok) {
      throw encrypted.error;
    }

    const tampered = {
      ...encrypted.value,
      ciphertext: `${encrypted.value.ciphertext.slice(0, -2)}ab`,
    };

    const decrypted = decryptSecret(tampered, env);
    expect(decrypted.ok).toBe(false);
    if (decrypted.ok) return;

    expect(decrypted.error.code).toBe("AI_SECRET_DECRYPTION_FAILED");
  });
});
