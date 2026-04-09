import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../../domain/types/ai-provider.types";

interface OpenAIAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeoutMs?: number;
}

const DEFAULT_MODEL = "gpt-5.4-mini";
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_BASE_URL = "https://api.openai.com/v1/responses";

function resolveModel(request: AIGenerationRequest, fallbackModel: string): string {
  return request.model?.trim() || fallbackModel;
}

function resolveNumber(
  value: number | undefined,
  fallback: number | undefined,
): number | undefined {
  return typeof value === "number" ? value : fallback;
}

function toOpenAIError(payload: unknown, fallback: string) {
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

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractResponseText(payload: unknown): string {
  if (payload && typeof payload === "object" && "output_text" in payload) {
    const outputText = payload.output_text;
    if (typeof outputText === "string") {
      return outputText;
    }
  }

  if (
    payload &&
    typeof payload === "object" &&
    "output" in payload &&
    Array.isArray(payload.output)
  ) {
    return payload.output
      .flatMap((item) => {
        if (
          !item ||
          typeof item !== "object" ||
          !("content" in item) ||
          !Array.isArray(item.content)
        ) {
          return [];
        }

        return item.content;
      })
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }

        if ("text" in part && typeof part.text === "string") {
          return part.text;
        }

        return "";
      })
      .join("");
  }

  return "";
}

function extractStreamText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  if ("type" in payload && payload.type === "response.output_text.delta") {
    return "delta" in payload && typeof payload.delta === "string" ? payload.delta : "";
  }

  if ("delta" in payload && typeof payload.delta === "string") {
    return payload.delta;
  }

  if ("text" in payload && typeof payload.text === "string") {
    return payload.text;
  }

  return "";
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

    const rest = buffer.trim();
    if (rest) {
      const data = rest
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("\n");

      if (data) {
        yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export class OpenAIAdapter implements AIProviderPort {
  public readonly id: AIProviderId = "OPENAI";

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultTemperature?: number;
  private readonly defaultMaxTokens?: number;
  private readonly timeoutMs: number;

  constructor(options: OpenAIAdapterOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.defaultTemperature = options.defaultTemperature;
    this.defaultMaxTokens = options.defaultMaxTokens;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async generate(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    if (!this.apiKey) {
      return fail(new DomainError("Missing OPENAI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
    }

    const model = resolveModel(request, this.defaultModel);
    const abortScope = this.createAbortScope(signal);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.buildPayload(request, model, false)),
        signal: abortScope.signal,
      });

      if (!response.ok) {
        const payload = await safeReadJson(response);
        return fail(
          new DomainError(
            toOpenAIError(payload, "OpenAI upstream error"),
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
      }

      const payload = await safeReadJson(response);
      const text = extractResponseText(payload);

      if (!text.trim()) {
        return fail(
          new DomainError("OpenAI returned an empty response", "AI_PROVIDER_UPSTREAM_ERROR"),
        );
      }

      return ok({
        provider: this.id,
        model,
        text,
      });
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        return fail(new DomainError("OpenAI request timeout", "AI_PROVIDER_TIMEOUT"));
      }

      const message = error instanceof Error ? error.message : "OpenAI upstream error";
      return fail(new DomainError(message, "AI_PROVIDER_UPSTREAM_ERROR"));
    } finally {
      abortScope.dispose();
    }
  }

  public async *stream(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    if (!this.apiKey) {
      yield fail(new DomainError("Missing OPENAI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
      return;
    }

    const model = resolveModel(request, this.defaultModel);
    const abortScope = this.createAbortScope(signal);
    let hasTextChunks = false;

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.buildPayload(request, model, true)),
        signal: abortScope.signal,
      });

      if (!response.ok) {
        const payload = await safeReadJson(response);
        yield fail(
          new DomainError(
            toOpenAIError(payload, "OpenAI upstream error"),
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
        return;
      }

      if (!response.body) {
        yield fail(new DomainError("OpenAI stream is unavailable", "AI_PROVIDER_UPSTREAM_ERROR"));
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

        if (
          payload &&
          typeof payload === "object" &&
          "type" in payload &&
          payload.type === "error"
        ) {
          const message =
            "message" in payload && typeof payload.message === "string"
              ? payload.message
              : "OpenAI stream failed";
          yield fail(new DomainError(message, "AI_PROVIDER_UPSTREAM_ERROR"));
          return;
        }

        const text = extractStreamText(payload);
        if (!text) {
          continue;
        }

        hasTextChunks = true;
        yield ok({
          provider: this.id,
          model,
          index,
          text,
        });
        index += 1;
      }

      if (!hasTextChunks) {
        const fallback = await this.generate(request, signal);
        if (!fallback.ok) {
          yield fail(fallback.error);
          return;
        }

        yield ok({
          provider: this.id,
          model,
          index: 0,
          text: fallback.value.text,
        });
      }
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        if (hasTextChunks) {
          yield fail(
            new DomainError(
              "OpenAI stream was interrupted after partial output",
              "AI_PROVIDER_TIMEOUT",
            ),
          );
          return;
        }

        yield fail(new DomainError("OpenAI stream timeout", "AI_PROVIDER_TIMEOUT"));
        return;
      }

      if (hasTextChunks) {
        yield fail(
          new DomainError(
            "OpenAI stream was interrupted after partial output",
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
        return;
      }

      const fallback = await this.generate(request, signal);
      if (!fallback.ok) {
        yield fail(fallback.error);
        return;
      }

      yield ok({
        provider: this.id,
        model,
        index: 0,
        text: fallback.value.text,
      });
    } finally {
      abortScope.dispose();
    }
  }

  public async testConnection(timeoutMs?: number): Promise<Result<void, DomainError>> {
    if (!this.apiKey) {
      return fail(new DomainError("Missing OPENAI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
    }

    const abortScope = this.createAbortScope(undefined, timeoutMs ?? 5_000);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.defaultModel,
          input: "ping",
          max_output_tokens: 1,
        }),
        signal: abortScope.signal,
      });

      if (!response.ok) {
        const payload = await safeReadJson(response);
        return fail(
          new DomainError(
            toOpenAIError(payload, "OpenAI connection failed"),
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
      }

      return ok(undefined);
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        return fail(new DomainError("OpenAI connection test timeout", "AI_PROVIDER_TIMEOUT"));
      }

      const message = error instanceof Error ? error.message : "OpenAI connection failed";
      return fail(new DomainError(message, "AI_PROVIDER_UPSTREAM_ERROR"));
    } finally {
      abortScope.dispose();
    }
  }

  private buildPayload(request: AIGenerationRequest, model: string, stream: boolean) {
    const payload: Record<string, unknown> = {
      model,
      input: request.prompt,
      stream,
    };

    const temperature = resolveNumber(request.temperature, this.defaultTemperature);
    if (typeof temperature === "number") {
      payload.temperature = temperature;
    }

    const maxTokens = resolveNumber(request.maxTokens, this.defaultMaxTokens);
    if (typeof maxTokens === "number") {
      payload.max_output_tokens = maxTokens;
    }

    if (request.responseFormat?.mimeType === "application/json" && request.responseFormat.schema) {
      payload.text = {
        format: {
          type: "json_schema",
          name: "lumacraft_response",
          schema: request.responseFormat.schema,
        },
      };
    }

    return payload;
  }

  private createAbortScope(signal?: AbortSignal, overrideTimeoutMs?: number) {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new Error("timeout"));
    }, overrideTimeoutMs ?? this.timeoutMs);

    const abortListener = () => {
      controller.abort(signal?.reason);
    };

    signal?.addEventListener("abort", abortListener);

    return {
      signal: controller.signal,
      timedOut: () => controller.signal.aborted && !signal?.aborted,
      dispose: () => {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abortListener);
      },
    };
  }

  private isAbortError(error: unknown) {
    return error instanceof DOMException
      ? error.name === "AbortError"
      : error instanceof Error && error.name === "AbortError";
  }
}
