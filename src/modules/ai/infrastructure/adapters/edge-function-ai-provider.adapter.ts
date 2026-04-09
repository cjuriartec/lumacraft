import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../../domain/types/ai-provider.types";

interface EdgeFunctionAIProviderAdapterOptions {
  accountId: string;
  providerId: AIProviderId;
  apiKey?: string;
  functionUrl: string;
  functionKey: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeoutMs?: number;
}

interface EdgeFunctionSuccessPayload<T> {
  data: T;
}

interface EdgeFunctionErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

const DEFAULT_TIMEOUT_MS = 45_000;

function resolveModel(
  request: AIGenerationRequest,
  fallbackModel: string | undefined,
): string | undefined {
  return request.model?.trim() || fallbackModel;
}

function resolveNumber(
  value: number | undefined,
  fallback: number | undefined,
): number | undefined {
  return typeof value === "number" ? value : fallback;
}

async function safeReadJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function* parseNdjson(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<Record<string, unknown>, void, void> {
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
        const newlineIndex = buffer.indexOf("\n");
        if (newlineIndex < 0) {
          break;
        }

        const rawLine = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!rawLine) {
          continue;
        }

        const payload = JSON.parse(rawLine) as Record<string, unknown>;
        yield payload;
      }
    }

    const rest = buffer.trim();
    if (rest) {
      yield JSON.parse(rest) as Record<string, unknown>;
    }
  } finally {
    reader.releaseLock();
  }
}

export class EdgeFunctionAIProviderAdapter implements AIProviderPort {
  public readonly id: AIProviderId;

  private readonly accountId: string;
  private readonly apiKey?: string;
  private readonly functionUrl: string;
  private readonly functionKey: string;
  private readonly defaultModel?: string;
  private readonly defaultTemperature?: number;
  private readonly defaultMaxTokens?: number;
  private readonly timeoutMs: number;

  constructor(options: EdgeFunctionAIProviderAdapterOptions) {
    this.id = options.providerId;
    this.accountId = options.accountId;
    this.apiKey = options.apiKey;
    this.functionUrl = options.functionUrl;
    this.functionKey = options.functionKey;
    this.defaultModel = options.defaultModel;
    this.defaultTemperature = options.defaultTemperature;
    this.defaultMaxTokens = options.defaultMaxTokens;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async generate(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    const model = resolveModel(request, this.defaultModel) ?? "";
    const response = await this.requestFunction<EdgeFunctionSuccessPayload<AIGenerationResponse>>(
      "generate",
      request,
      signal,
    );

    if (!response.ok) {
      return fail(response.error);
    }

    return ok({
      provider: this.id,
      model: response.value.data.model || model,
      text: response.value.data.text,
      usage: response.value.data.usage,
    });
  }

  public async *stream(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    const abortScope = this.createAbortScope(signal);

    try {
      const response = await fetch(this.functionUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildPayload("stream", request)),
        signal: abortScope.signal,
      });

      if (!response.ok) {
        const payload = (await safeReadJson(response)) as EdgeFunctionErrorPayload | null;
        yield fail(
          new DomainError(
            payload?.error?.message ?? "Edge Function stream failed",
            payload?.error?.code ?? "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
        return;
      }

      if (!response.body) {
        yield fail(
          new DomainError("Edge Function stream is unavailable", "AI_PROVIDER_UPSTREAM_ERROR"),
        );
        return;
      }

      for await (const payload of parseNdjson(response.body)) {
        if (payload.type === "error") {
          const code =
            typeof payload.code === "string" ? payload.code : "AI_PROVIDER_UPSTREAM_ERROR";
          const message =
            typeof payload.message === "string" ? payload.message : "Edge Function stream failed";
          yield fail(new DomainError(message, code));
          return;
        }

        if (payload.type !== "chunk") {
          continue;
        }

        const model = typeof payload.model === "string" ? payload.model : (this.defaultModel ?? "");
        const index = typeof payload.index === "number" ? payload.index : 0;
        const text = typeof payload.text === "string" ? payload.text : "";
        if (!text) {
          continue;
        }

        yield ok({
          provider: this.id,
          model,
          index,
          text,
        });
      }
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        yield fail(new DomainError("AI Edge Function stream timeout", "AI_PROVIDER_TIMEOUT"));
        return;
      }

      const message = error instanceof Error ? error.message : "Edge Function stream failed";
      yield fail(new DomainError(message, "AI_PROVIDER_UPSTREAM_ERROR"));
    } finally {
      abortScope.dispose();
    }
  }

  public async testConnection(timeoutMs?: number): Promise<Result<void, DomainError>> {
    const result = await this.requestFunction<EdgeFunctionSuccessPayload<{ ok: true }>>(
      "test_connection",
      {
        prompt: "ping",
      },
      undefined,
      timeoutMs ?? 5_000,
    );

    return result.ok ? ok(undefined) : fail(result.error);
  }

  private buildHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.functionKey}`,
      apikey: this.functionKey,
    };
  }

  private buildPayload(
    action: "generate" | "stream" | "test_connection",
    request: AIGenerationRequest,
  ) {
    return {
      action,
      accountId: this.accountId,
      providerId: this.id,
      apiKey: this.apiKey,
      prompt: request.prompt,
      model: resolveModel(request, this.defaultModel),
      temperature: resolveNumber(request.temperature, this.defaultTemperature),
      maxTokens: resolveNumber(request.maxTokens, this.defaultMaxTokens),
      groundingContext: request.groundingContext,
      metadata: request.metadata,
      responseFormat: request.responseFormat,
      timeoutMs: this.timeoutMs,
    };
  }

  private async requestFunction<T>(
    action: "generate" | "test_connection",
    request: AIGenerationRequest,
    signal?: AbortSignal,
    timeoutMs?: number,
  ): Promise<Result<T, DomainError>> {
    const abortScope = this.createAbortScope(signal, timeoutMs);

    try {
      const response = await fetch(this.functionUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(this.buildPayload(action, request)),
        signal: abortScope.signal,
      });

      const payload = (await safeReadJson(response)) as T & EdgeFunctionErrorPayload;

      if (!response.ok) {
        return fail(
          new DomainError(
            payload?.error?.message ?? "Edge Function request failed",
            payload?.error?.code ?? "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
      }

      return ok(payload);
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        return fail(new DomainError("AI Edge Function timeout", "AI_PROVIDER_TIMEOUT"));
      }

      const message = error instanceof Error ? error.message : "Edge Function request failed";
      return fail(new DomainError(message, "AI_PROVIDER_UPSTREAM_ERROR"));
    } finally {
      abortScope.dispose();
    }
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
