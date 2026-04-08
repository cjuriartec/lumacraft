import { describe, expect, it } from "vitest";

import { DefaultAIProviderFactory } from "@/modules/ai/infrastructure/factories/default-ai-provider.factory";

describe("DefaultAIProviderFactory", () => {
  it("creates default GEMINI provider from env", () => {
    const factory = DefaultAIProviderFactory.fromEnv({
      AI_DEFAULT_PROVIDER: "GEMINI",
      AI_DEFAULT_MODEL: "gemini-test",
      AI_REQUEST_TIMEOUT_MS: "1000",
      NODE_ENV: "test",
    } as NodeJS.ProcessEnv);

    const providerResult = factory.create();

    expect(providerResult.ok).toBe(true);
    if (providerResult.ok) {
      expect(providerResult.value.id).toBe("GEMINI");
    }
  });

  it("returns AI_PROVIDER_NOT_CONFIGURED for OPENAI when API key is missing", async () => {
    const factory = new DefaultAIProviderFactory({
      defaultProvider: "OPENAI",
    });

    const providerResult = factory.create("OPENAI");
    expect(providerResult.ok).toBe(true);

    if (!providerResult.ok) return;

    const result = await providerResult.value.generate({
      prompt: "Hola",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("AI_PROVIDER_NOT_CONFIGURED");
    }
  });
});
