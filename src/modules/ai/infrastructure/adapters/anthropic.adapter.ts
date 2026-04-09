import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../../domain/types/ai-provider.types";

interface AnthropicAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeoutMs?: number;
}

const DEFAULT_MODEL = "claude-3-7-sonnet";
const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages";

function resolveModel(request: AIGenerationRequest, fallbackModel: string): string {
  return request.model?.trim() || fallbackModel;
}

function resolveNumber(
  value: number | undefined,
  fallback: number | undefined,
): number | undefined {
  return typeof value === "number" ? value : fallback;
}

function buildPrompt(request: AIGenerationRequest): string {
  if (request.responseFormat?.mimeType !== "application/json") {
    return request.prompt;
  }

  const instructions = ["Return only valid JSON."];
  if (request.responseFormat.schema) {
    instructions.push(
      `The JSON must satisfy this schema: ${JSON.stringify(request.responseFormat.schema)}`,
    );
  }

  return `${request.prompt}\n\n${instructions.join(" ")}`;
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractAnthropicError(payload: unknown, fallback: string) {
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

function extractResponseText(payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "content" in payload &&
    Array.isArray(payload.content)
  ) {
    return payload.content
      .map((part) => {
        if (!part || typeof part !== "object") {
          return "";
        }

        return "text" in part && typeof part.text === "string" ? part.text : "";
      })
      .join("");
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
  } finally {
    reader.releaseLock();
  }
}

export class AnthropicAdapter implements AIProviderPort {
  public readonly id: AIProviderId = "ANTHROPIC";

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultTemperature?: number;
  private readonly defaultMaxTokens?: number;
  private readonly timeoutMs: number;

  constructor(options: AnthropicAdapterOptions = {}) {
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
      return fail(new DomainError("Missing ANTHROPIC_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
    }

    const model = resolveModel(request, this.defaultModel);
    const abortScope = this.createAbortScope(signal);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildPayload(request, model, false)),
        signal: abortScope.signal,
      });

      if (!response.ok) {
        const payload = await safeReadJson(response);
        return fail(
          new DomainError(
            extractAnthropicError(payload, "Anthropic upstream error"),
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
      }

      const payload = await safeReadJson(response);
      const text = extractResponseText(payload);

      if (!text.trim()) {
        return fail(
          new DomainError("Anthropic returned an empty response", "AI_PROVIDER_UPSTREAM_ERROR"),
        );
      }

      return ok({
        provider: this.id,
        model,
        text,
      });
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        return fail(new DomainError("Anthropic request timeout", "AI_PROVIDER_TIMEOUT"));
      }

      const message = error instanceof Error ? error.message : "Anthropic upstream error";
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
      yield fail(new DomainError("Missing ANTHROPIC_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
      return;
    }

    const model = resolveModel(request, this.defaultModel);
    const abortScope = this.createAbortScope(signal);
    let hasTextChunks = false;

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildPayload(request, model, true)),
        signal: abortScope.signal,
      });

      if (!response.ok) {
        const payload = await safeReadJson(response);
        yield fail(
          new DomainError(
            extractAnthropicError(payload, "Anthropic upstream error"),
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
        return;
      }

      if (!response.body) {
        yield fail(
          new DomainError("Anthropic stream is unavailable", "AI_PROVIDER_UPSTREAM_ERROR"),
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

        if (
          payload &&
          typeof payload === "object" &&
          "type" in payload &&
          payload.type === "error"
        ) {
          const message =
            "error" in payload &&
            payload.error &&
            typeof payload.error === "object" &&
            "message" in payload.error &&
            typeof payload.error.message === "string"
              ? payload.error.message
              : "Anthropic stream failed";
          yield fail(new DomainError(message, "AI_PROVIDER_UPSTREAM_ERROR"));
          return;
        }

        const text =
          payload &&
          typeof payload === "object" &&
          "type" in payload &&
          payload.type === "content_block_delta" &&
          "delta" in payload &&
          payload.delta &&
          typeof payload.delta === "object" &&
          "text" in payload.delta &&
          typeof payload.delta.text === "string"
            ? payload.delta.text
            : "";

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
              "Anthropic stream was interrupted after partial output",
              "AI_PROVIDER_TIMEOUT",
            ),
          );
          return;
        }

        yield fail(new DomainError("Anthropic stream timeout", "AI_PROVIDER_TIMEOUT"));
        return;
      }

      if (hasTextChunks) {
        yield fail(
          new DomainError(
            "Anthropic stream was interrupted after partial output",
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
      return fail(new DomainError("Missing ANTHROPIC_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
    }

    const abortScope = this.createAbortScope(undefined, timeoutMs ?? 5_000);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: abortScope.signal,
      });

      if (!response.ok) {
        const payload = await safeReadJson(response);
        return fail(
          new DomainError(
            extractAnthropicError(payload, "Anthropic connection failed"),
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
      }

      return ok(undefined);
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        return fail(new DomainError("Anthropic connection test timeout", "AI_PROVIDER_TIMEOUT"));
      }

      const message = error instanceof Error ? error.message : "Anthropic connection failed";
      return fail(new DomainError(message, "AI_PROVIDER_UPSTREAM_ERROR"));
    } finally {
      abortScope.dispose();
    }
  }

  private buildHeaders() {
    return {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": this.apiKey ?? "",
    };
  }

  private buildPayload(request: AIGenerationRequest, model: string, stream: boolean) {
    const payload: Record<string, unknown> = {
      model,
      stream,
      messages: [
        {
          role: "user",
          content: buildPrompt(request),
        },
      ],
      max_tokens: resolveNumber(request.maxTokens, this.defaultMaxTokens) ?? 300,
    };

    const temperature = resolveNumber(request.temperature, this.defaultTemperature);
    if (typeof temperature === "number") {
      payload.temperature = temperature;
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
