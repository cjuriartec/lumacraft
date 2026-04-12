import { describe, expect, it, vi } from "vitest";

import { ImproveTextUseCase } from "@/modules/ai/application/use-cases/improve-text.use-case";
import { AIProviderPort } from "@/modules/ai/domain/ports/ai-provider.port";
import { DomainError, fail, ok } from "@/shared/domain/result";

describe("ImproveTextUseCase", () => {
  const mockProvider: AIProviderPort = {
    id: "GEMINI",
    generate: vi.fn(),
    stream: vi.fn(),
    testConnection: vi.fn(),
  };

  const useCase = new ImproveTextUseCase();

  it("should fail if text is empty", async () => {
    const result = await useCase.execute({
      text: "",
      tone: "formal",
      provider: mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("vacío");
    }
  });

  it("should successfully improve text with a specific tone", async () => {
    const originalText = "Hola como estas";
    const improvedText = "Estimado, espero que se encuentre bien.";

    vi.mocked(mockProvider.generate).mockResolvedValue(
      ok({
        text: improvedText,
        model: "test-model",
        provider: "GEMINI",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
    );

    const result = await useCase.execute({
      text: originalText,
      tone: "formal",
      provider: mockProvider,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(improvedText);
    }

    expect(mockProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining("corporativo"),
      }),
    );
  });

  it("should handle AI provider errors", async () => {
    vi.mocked(mockProvider.generate).mockResolvedValue(
      fail(new DomainError("AI Failed", "AI_ERROR")),
    );

    const result = await useCase.execute({
      text: "test",
      tone: "tecnico",
      provider: mockProvider,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("AI Failed");
    }
  });
});
