import { describe, expect, it } from "vitest";

import { AccountAISettings } from "@/modules/ai/domain/entities/account-ai-settings.entity";

describe("AccountAISettings Entity", () => {
  const accountId = crypto.randomUUID();

  const validProps = {
    accountId,
    defaultProvider: "GEMINI" as const,
    defaultModel: "gemini-2.0-flash",
    defaultTemperature: 0.2,
    defaultMaxTokens: 300,
    requestTimeoutMs: 25000,
    featureTemplateAI: true,
    featureTemplateLogic: true,
    templatePreviewTimeoutMs: 45000,
    templatePreviewMaxAIBlocks: 3,
    systemPrompt: "Test prompt",
    enableFallback: true,
    fallbackProvider: "OPENAI" as const,
    fallbackModel: "gpt-5.4-mini",
    providerOptions: {
      GEMINI: { allowedModels: ["gemini-2.0-flash"] },
      OPENAI: { allowedModels: ["gpt-5.4-mini"] },
      ANTHROPIC: { allowedModels: [] },
    },
    providerSecrets: {},
  };

  it("should create a valid settings object with fallback enabled", () => {
    const result = AccountAISettings.create(validProps);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.enableFallback).toBe(true);
      expect(result.value.fallbackProvider).toBe("OPENAI");
      expect(result.value.fallbackModel).toBe("gpt-5.4-mini");
    }
  });

  it("should fail if fallback model is not enabled for the fallback provider", () => {
    const invalidProps = {
      ...validProps,
      fallbackModel: "non-existent-model",
    };

    const result = AccountAISettings.create(invalidProps);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ACCOUNT_AI_SETTINGS_INVALID_FALLBACK_MODEL");
    }
  });

  it("should update fallback fields via withPatch", () => {
    const initialResult = AccountAISettings.create(validProps);
    expect(initialResult.ok).toBe(true);
    if (!initialResult.ok) return;

    const patchedResult = initialResult.value.withPatch({
      enableFallback: false,
      fallbackProvider: "ANTHROPIC",
      fallbackModel: "claude-3-7-sonnet",
      providerOptions: {
        ...validProps.providerOptions,
        ANTHROPIC: { allowedModels: ["claude-3-7-sonnet"] },
      },
    });

    expect(patchedResult.ok).toBe(true);
    if (patchedResult.ok) {
      expect(patchedResult.value.enableFallback).toBe(false);
      expect(patchedResult.value.fallbackProvider).toBe("ANTHROPIC");
      expect(patchedResult.value.fallbackModel).toBe("claude-3-7-sonnet");
    }
  });

  it("should use default fallback values if not provided", () => {
    const propsWithoutFallback = {
      ...validProps,
      enableFallback: undefined,
      fallbackProvider: undefined,
      fallbackModel: undefined,
    };

    const result = AccountAISettings.create(propsWithoutFallback);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.enableFallback).toBe(false);
      expect(result.value.fallbackProvider).toBe("OPENAI");
      expect(result.value.fallbackModel).toBe("gpt-5.4-mini");
    }
  });
});
