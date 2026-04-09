import { describe, expect, it, vi } from "vitest";

import { AIProviderPort } from "@/modules/ai/domain/ports/ai-provider.port";
import { FallbackAIProviderDecorator } from "@/modules/ai/infrastructure/decorators/fallback-ai-provider.decorator";
import { DomainError, fail, ok } from "@/shared/domain/result";

describe("FallbackAIProviderDecorator", () => {
  const mockPrimary: AIProviderPort = {
    id: "GEMINI",
    generate: vi.fn(),
    stream: vi.fn(),
    testConnection: vi.fn(),
  };

  const mockFallback: AIProviderPort = {
    id: "OPENAI",
    generate: vi.fn(),
    stream: vi.fn(),
    testConnection: vi.fn(),
  };

  const options = { enableFallback: true };

  it("should return primary result if it succeeds", async () => {
    const decorator = new FallbackAIProviderDecorator(mockPrimary, mockFallback, options);
    const successResponse = {
      text: "Success",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      provider: "GEMINI" as const,
      model: "gemini-2.5-flash",
    };

    vi.mocked(mockPrimary.generate).mockResolvedValueOnce(ok(successResponse));

    const result = await decorator.generate({ prompt: "test" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("Success");
    }
    expect(mockPrimary.generate).toHaveBeenCalled();
    expect(mockFallback.generate).not.toHaveBeenCalled();
  });

  it("should return fallback result if primary fails", async () => {
    const decorator = new FallbackAIProviderDecorator(mockPrimary, mockFallback, options);
    const fallbackResponse = {
      text: "Fallback",
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      provider: "OPENAI" as const,
      model: "gpt-4o",
    };

    vi.mocked(mockPrimary.generate).mockResolvedValueOnce(
      fail(new DomainError("Primary failed", "ERROR")),
    );
    vi.mocked(mockFallback.generate).mockResolvedValueOnce(ok(fallbackResponse));

    const result = await decorator.generate({ prompt: "test" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.text).toBe("Fallback");
    }
    expect(mockPrimary.generate).toHaveBeenCalled();
    expect(mockFallback.generate).toHaveBeenCalled();
  });

  it("should return primary error if fallback is disabled", async () => {
    const decorator = new FallbackAIProviderDecorator(mockPrimary, mockFallback, {
      enableFallback: false,
    });

    vi.mocked(mockPrimary.generate).mockResolvedValueOnce(
      fail(new DomainError("Primary failed", "ERROR")),
    );

    const result = await decorator.generate({ prompt: "test" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Primary failed");
    }
    expect(mockFallback.generate).not.toHaveBeenCalled();
  });

  it("should return fallback error if both fail", async () => {
    const decorator = new FallbackAIProviderDecorator(mockPrimary, mockFallback, options);

    vi.mocked(mockPrimary.generate).mockResolvedValueOnce(
      fail(new DomainError("Primary failed", "P_ERROR")),
    );
    vi.mocked(mockFallback.generate).mockResolvedValueOnce(
      fail(new DomainError("Fallback failed", "F_ERROR")),
    );

    const result = await decorator.generate({ prompt: "test" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Fallback failed");
      expect(result.error.code).toBe("F_ERROR");
    }
  });
});
