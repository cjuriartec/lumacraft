import { afterEach, describe, expect, it, vi } from "vitest";

import { GeminiAdapter } from "@/modules/ai/infrastructure/adapters/gemini.adapter";

const sdkState = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
  generateContentStreamMock: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class MockGoogleGenAI {
    public models = {
      generateContent: sdkState.generateContentMock,
      generateContentStream: sdkState.generateContentStreamMock,
    };
  },
}));

describe("GeminiAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sdkState.generateContentMock.mockReset();
    sdkState.generateContentStreamMock.mockReset();
  });

  it("maps requests to the official SDK generateContent payload", async () => {
    const adapter = new GeminiAdapter({
      apiKey: "test-key",
      defaultModel: "gemini-test",
      defaultTemperature: 0.4,
      defaultMaxTokens: 256,
      timeoutMs: 5_000,
      thinkingConfig: {
        thinkingBudget: 128,
      },
    });

    sdkState.generateContentMock.mockResolvedValueOnce({
      text: "Hola desde Gemini",
    });

    const result = await adapter.generate({
      prompt: "hola",
      responseFormat: {
        mimeType: "application/json",
        schema: {
          type: "object",
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(sdkState.generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-test",
        contents: "hola",
        config: expect.objectContaining({
          temperature: 0.4,
          maxOutputTokens: 256,
          responseMimeType: "application/json",
          responseSchema: { type: "object" },
          thinkingConfig: { thinkingBudget: 128 },
        }),
      }),
    );
  });

  it("falls back to non-stream generate when stream has no text", async () => {
    const adapter = new GeminiAdapter({
      apiKey: "test-key",
      defaultModel: "gemini-test",
      timeoutMs: 5_000,
    });

    sdkState.generateContentStreamMock.mockResolvedValueOnce(
      (async function* () {
        yield { text: "" };
      })(),
    );
    sdkState.generateContentMock.mockResolvedValueOnce({
      text: "Texto fallback",
    });

    const output: string[] = [];
    for await (const chunkResult of adapter.stream({ prompt: "hola" })) {
      if (!chunkResult.ok) {
        throw chunkResult.error;
      }
      output.push(chunkResult.value.text);
    }

    expect(output.join("")).toBe("Texto fallback");
    expect(sdkState.generateContentStreamMock).toHaveBeenCalledTimes(1);
    expect(sdkState.generateContentMock).toHaveBeenCalledTimes(1);
  });

  it("does not duplicate partial output when the stream breaks after emitting text", async () => {
    const adapter = new GeminiAdapter({
      apiKey: "test-key",
      defaultModel: "gemini-test",
      timeoutMs: 5_000,
    });

    sdkState.generateContentStreamMock.mockResolvedValueOnce(
      (async function* () {
        yield { text: "Texto parcial" };
        throw new Error("stream broke");
      })(),
    );

    const output: string[] = [];
    const failures: string[] = [];

    for await (const chunkResult of adapter.stream({ prompt: "hola" })) {
      if (!chunkResult.ok) {
        failures.push(chunkResult.error.message);
        continue;
      }

      output.push(chunkResult.value.text);
    }

    expect(output).toEqual(["Texto parcial"]);
    expect(failures).toEqual(["Gemini stream was interrupted after partial output"]);
    expect(sdkState.generateContentMock).not.toHaveBeenCalled();
  });
});
