import { afterEach, describe, expect, it, vi } from "vitest";

import { GeminiAdapter } from "@/modules/ai/infrastructure/adapters/gemini.adapter";

function toSseEventFromJson(value: unknown, pretty = false): string {
  const json = pretty ? JSON.stringify(value, null, 2) : JSON.stringify(value);
  return `${json
    .split("\n")
    .map((line) => `data: ${line}`)
    .join("\n")}\n\n`;
}

function createSseResponse(events: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(events.join("")));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

function createBrokenSseResponse(events: string[], error: Error): Response {
  const encoder = new TextEncoder();
  let delivered = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!delivered) {
        delivered = true;
        controller.enqueue(encoder.encode(events.join("")));
        return;
      }

      controller.error(error);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
    },
  });
}

describe("GeminiAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("parses multiline SSE JSON chunks and emits streamed text", async () => {
    const streamPayload = {
      candidates: [
        {
          content: {
            parts: [{ text: "Hola desde Gemini" }],
          },
        },
      ],
    };

    const fetchMock = vi.fn(async () =>
      createSseResponse([toSseEventFromJson(streamPayload, true), "data: [DONE]\n\n"]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GeminiAdapter({
      apiKey: "test-key",
      defaultModel: "gemini-test",
      timeoutMs: 5_000,
    });

    const output: string[] = [];
    for await (const chunkResult of adapter.stream({ prompt: "hola" })) {
      if (!chunkResult.ok) {
        throw chunkResult.error;
      }
      output.push(chunkResult.value.text);
    }

    expect(output.join("")).toBe("Hola desde Gemini");
  });

  it("falls back to non-stream generate when stream has no text", async () => {
    const emptyStreamPayload = {
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: "text/plain" } }],
          },
        },
      ],
    };

    const fallbackPayload = {
      candidates: [
        {
          content: {
            parts: [{ text: "Texto fallback" }],
          },
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createSseResponse([toSseEventFromJson(emptyStreamPayload), "data: [DONE]\n\n"]),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(fallbackPayload), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GeminiAdapter({
      apiKey: "test-key",
      defaultModel: "gemini-test",
      timeoutMs: 5_000,
    });

    const output: string[] = [];
    for await (const chunkResult of adapter.stream({ prompt: "hola" })) {
      if (!chunkResult.ok) {
        throw chunkResult.error;
      }
      output.push(chunkResult.value.text);
    }

    expect(output.join("")).toBe("Texto fallback");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not duplicate partial output when the stream breaks after emitting text", async () => {
    const streamPayload = {
      candidates: [
        {
          content: {
            parts: [{ text: "Texto parcial" }],
          },
        },
      ],
    };

    const fetchMock = vi.fn(async () =>
      createBrokenSseResponse([toSseEventFromJson(streamPayload)], new Error("stream broke")),
    );
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new GeminiAdapter({
      apiKey: "test-key",
      defaultModel: "gemini-test",
      timeoutMs: 5_000,
    });

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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
