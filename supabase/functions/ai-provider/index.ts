declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response>): void;
};

type ProviderId = "GEMINI" | "OPENAI" | "ANTHROPIC";

interface AIRequestBody {
  action: "generate" | "stream" | "test_connection";
  accountId: string;
  providerId: ProviderId;
  apiKey?: string;
  prompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  groundingContext?: string;
  metadata?: Record<string, unknown>;
  responseFormat?: {
    mimeType?: "application/json" | "text/plain";
    schema?: Record<string, unknown>;
  };
  timeoutMs?: number;
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function resolveApiKey(body: AIRequestBody): string | null {
  if (body.apiKey?.trim()) {
    return body.apiKey.trim();
  }

  switch (body.providerId) {
    case "GEMINI":
      return Deno.env.get("GEMINI_API_KEY") ?? null;
    case "OPENAI":
      return Deno.env.get("OPENAI_API_KEY") ?? null;
    case "ANTHROPIC":
      return Deno.env.get("ANTHROPIC_API_KEY") ?? null;
    default:
      return null;
  }
}

function resolveTimeout(timeoutMs: unknown): number {
  return typeof timeoutMs === "number" && timeoutMs >= 1_000 ? timeoutMs : 25_000;
}

function createAbortScope(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error("timeout"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
    },
  };
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessageFromPayload(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }

  return fallback;
}

async function* parseSseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const separatorIndex = buffer.indexOf("\n\n");
        if (separatorIndex < 0) {
          break;
        }

        const rawEvent = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);

        const data = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("\n");

        if (data) {
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function extractOpenAIText(payload: unknown): string {
  if (payload && typeof payload === "object" && "output_text" in payload) {
    return typeof payload.output_text === "string" ? payload.output_text : "";
  }

  if (
    payload &&
    typeof payload === "object" &&
    "output" in payload &&
    Array.isArray(payload.output)
  ) {
    return payload.output
      .flatMap((item) =>
        item && typeof item === "object" && Array.isArray(item.content) ? item.content : [],
      )
      .map((part) =>
        part && typeof part === "object" && typeof part.text === "string" ? part.text : "",
      )
      .join("");
  }

  return "";
}

function extractAnthropicText(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "content" in payload &&
    Array.isArray(payload.content)
  ) {
    return payload.content
      .map((part) =>
        part && typeof part === "object" && typeof part.text === "string" ? part.text : "",
      )
      .join("");
  }

  return "";
}

function extractGeminiText(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "candidates" in payload &&
    Array.isArray(payload.candidates)
  ) {
    return payload.candidates
      .flatMap((candidate) =>
        candidate &&
        typeof candidate === "object" &&
        candidate.content &&
        typeof candidate.content === "object" &&
        Array.isArray(candidate.content.parts)
          ? candidate.content.parts
          : [],
      )
      .map((part) =>
        part && typeof part === "object" && typeof part.text === "string" ? part.text : "",
      )
      .join("");
  }

  return "";
}

function buildOpenAIPayload(body: AIRequestBody, stream: boolean) {
  const payload: Record<string, unknown> = {
    model: body.model ?? "gpt-5.4-mini",
    input: body.prompt ?? "",
    stream,
  };

  if (typeof body.temperature === "number") {
    payload.temperature = body.temperature;
  }

  if (typeof body.maxTokens === "number") {
    payload.max_output_tokens = body.maxTokens;
  }

  if (body.responseFormat?.mimeType === "application/json" && body.responseFormat.schema) {
    payload.text = {
      format: {
        type: "json_schema",
        name: "lumacraft_response",
        schema: body.responseFormat.schema,
      },
    };
  }

  return payload;
}

function buildAnthropicPrompt(body: AIRequestBody) {
  if (body.responseFormat?.mimeType !== "application/json") {
    return body.prompt ?? "";
  }

  const instructions = ["Return only valid JSON."];
  if (body.responseFormat.schema) {
    instructions.push(
      `The JSON must satisfy this schema: ${JSON.stringify(body.responseFormat.schema)}`,
    );
  }

  return `${body.prompt ?? ""}\n\n${instructions.join(" ")}`;
}

function buildAnthropicPayload(body: AIRequestBody, stream: boolean) {
  const payload: Record<string, unknown> = {
    model: body.model ?? "claude-3-7-sonnet",
    max_tokens: typeof body.maxTokens === "number" ? body.maxTokens : 300,
    stream,
    messages: [
      {
        role: "user",
        content: buildAnthropicPrompt(body),
      },
    ],
  };

  if (typeof body.temperature === "number") {
    payload.temperature = body.temperature;
  }

  return payload;
}

function buildGeminiPayload(body: AIRequestBody) {
  const generationConfig: Record<string, unknown> = {};

  if (typeof body.temperature === "number") {
    generationConfig.temperature = body.temperature;
  }

  if (typeof body.maxTokens === "number") {
    generationConfig.maxOutputTokens = body.maxTokens;
  }

  if (body.responseFormat?.mimeType) {
    generationConfig.responseMimeType = body.responseFormat.mimeType;
  }

  if (body.responseFormat?.schema) {
    generationConfig.responseSchema = body.responseFormat.schema;
  }

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: body.prompt ?? "" }],
      },
    ],
    generationConfig,
  };
}

async function generateWithProvider(body: AIRequestBody, apiKey: string, signal: AbortSignal) {
  switch (body.providerId) {
    case "OPENAI": {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildOpenAIPayload(body, false)),
        signal,
      });

      const payload = await safeReadJson(response);
      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "AI_PROVIDER_UPSTREAM_ERROR",
            message: errorMessageFromPayload(payload, "OpenAI upstream error"),
          },
        };
      }

      return {
        ok: true,
        value: {
          provider: body.providerId,
          model: body.model ?? "gpt-5.4-mini",
          text: extractOpenAIText(payload),
        },
      };
    }
    case "ANTHROPIC": {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(buildAnthropicPayload(body, false)),
        signal,
      });

      const payload = await safeReadJson(response);
      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "AI_PROVIDER_UPSTREAM_ERROR",
            message: errorMessageFromPayload(payload, "Anthropic upstream error"),
          },
        };
      }

      return {
        ok: true,
        value: {
          provider: body.providerId,
          model: body.model ?? "claude-3-7-sonnet",
          text: extractAnthropicText(payload),
        },
      };
    }
    case "GEMINI":
    default: {
      const model = body.model ?? "gemini-2.0-flash";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildGeminiPayload(body)),
          signal,
        },
      );

      const payload = await safeReadJson(response);
      if (!response.ok) {
        return {
          ok: false,
          error: {
            code: "AI_PROVIDER_UPSTREAM_ERROR",
            message: errorMessageFromPayload(payload, "Gemini upstream error"),
          },
        };
      }

      return {
        ok: true,
        value: {
          provider: body.providerId,
          model,
          text: extractGeminiText(payload),
        },
      };
    }
  }
}

function buildStreamResponse(body: AIRequestBody, apiKey: string, signal: AbortSignal): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      const failStream = (code: string, message: string) => {
        enqueue({ type: "error", code, message });
      };

      void (async () => {
        try {
          switch (body.providerId) {
            case "OPENAI": {
              const response = await fetch("https://api.openai.com/v1/responses", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(buildOpenAIPayload(body, true)),
                signal,
              });

              if (!response.ok || !response.body) {
                const payload = await safeReadJson(response);
                failStream(
                  "AI_PROVIDER_UPSTREAM_ERROR",
                  errorMessageFromPayload(payload, "OpenAI stream failed"),
                );
                return;
              }

              let index = 0;
              for await (const rawEvent of parseSseData(response.body)) {
                if (rawEvent === "[DONE]") {
                  break;
                }

                let payload: unknown;
                try {
                  payload = JSON.parse(rawEvent);
                } catch {
                  continue;
                }

                const chunk = payload as { type?: string; delta?: string };
                const text =
                  chunk &&
                  typeof chunk === "object" &&
                  chunk.type === "response.output_text.delta" &&
                  typeof chunk.delta === "string"
                    ? chunk.delta
                    : typeof chunk?.delta === "string"
                      ? chunk.delta
                      : "";

                if (!text) {
                  continue;
                }

                enqueue({
                  type: "chunk",
                  provider: body.providerId,
                  model: body.model ?? "gpt-5.4-mini",
                  index,
                  text,
                });
                index += 1;
              }
              return;
            }
            case "ANTHROPIC": {
              const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "anthropic-version": "2023-06-01",
                  "x-api-key": apiKey,
                },
                body: JSON.stringify(buildAnthropicPayload(body, true)),
                signal,
              });

              if (!response.ok || !response.body) {
                const payload = await safeReadJson(response);
                failStream(
                  "AI_PROVIDER_UPSTREAM_ERROR",
                  errorMessageFromPayload(payload, "Anthropic stream failed"),
                );
                return;
              }

              let index = 0;
              for await (const rawEvent of parseSseData(response.body)) {
                let payload: unknown;
                try {
                  payload = JSON.parse(rawEvent);
                } catch {
                  continue;
                }

                const chunk = payload as { type?: string; delta?: { text?: string } };
                const text =
                  chunk &&
                  typeof chunk === "object" &&
                  chunk.type === "content_block_delta" &&
                  chunk.delta &&
                  typeof chunk.delta === "object" &&
                  typeof chunk.delta.text === "string"
                    ? chunk.delta.text
                    : "";

                if (!text) {
                  continue;
                }

                enqueue({
                  type: "chunk",
                  provider: body.providerId,
                  model: body.model ?? "claude-3-7-sonnet",
                  index,
                  text,
                });
                index += 1;
              }
              return;
            }
            case "GEMINI":
            default: {
              const model = body.model ?? "gemini-2.0-flash";
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(buildGeminiPayload(body)),
                  signal,
                },
              );

              if (!response.ok || !response.body) {
                const payload = await safeReadJson(response);
                failStream(
                  "AI_PROVIDER_UPSTREAM_ERROR",
                  errorMessageFromPayload(payload, "Gemini stream failed"),
                );
                return;
              }

              let index = 0;
              for await (const rawEvent of parseSseData(response.body)) {
                let payload: unknown;
                try {
                  payload = JSON.parse(rawEvent);
                } catch {
                  continue;
                }

                const text = extractGeminiText(payload);
                if (!text) {
                  continue;
                }

                enqueue({
                  type: "chunk",
                  provider: body.providerId,
                  model,
                  index,
                  text,
                });
                index += 1;
              }
              return;
            }
          }
        } catch (error) {
          failStream(
            signal.aborted ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_UPSTREAM_ERROR",
            error instanceof Error ? error.message : "AI provider stream failed",
          );
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json(405, {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
      },
    });
  }

  const body = (await request.json().catch(() => null)) as AIRequestBody | null;
  if (!body?.providerId || !body.action || !body.accountId) {
    return json(400, {
      error: {
        code: "INVALID_INPUT",
        message: "accountId, providerId and action are required",
      },
    });
  }

  const apiKey = resolveApiKey(body);
  if (!apiKey) {
    return json(400, {
      error: {
        code: "AI_PROVIDER_NOT_CONFIGURED",
        message: `Missing API key for ${body.providerId}`,
      },
    });
  }

  const abortScope = createAbortScope(resolveTimeout(body.timeoutMs));

  try {
    if (body.action === "stream") {
      return buildStreamResponse(body, apiKey, abortScope.signal);
    }

    if (body.action === "test_connection") {
      const result = await generateWithProvider(
        {
          ...body,
          prompt: "ping",
          maxTokens: 1,
        },
        apiKey,
        abortScope.signal,
      );

      if (!result.ok) {
        return json(400, { error: result.error });
      }

      return json(200, { data: { ok: true } });
    }

    const result = await generateWithProvider(body, apiKey, abortScope.signal);
    if (!result.ok) {
      return json(400, { error: result.error });
    }

    return json(200, { data: result.value });
  } catch (error) {
    return json(500, {
      error: {
        code: abortScope.signal.aborted ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_UPSTREAM_ERROR",
        message: error instanceof Error ? error.message : "Unexpected AI provider error",
      },
    });
  } finally {
    abortScope.dispose();
  }
});
