import { GoogleGenAI } from "@google/genai";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../../domain/types/ai-provider.types";

interface GeminiAdapterOptions {
  apiKey?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeoutMs?: number;
  thinkingConfig?: Record<string, unknown>;
}

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 25_000;

function resolveModel(request: AIGenerationRequest, fallbackModel: string): string {
  return request.model?.trim() || fallbackModel;
}

function resolveNumber(
  value: number | undefined,
  fallback: number | undefined,
): number | undefined {
  return typeof value === "number" ? value : fallback;
}

export class GeminiAdapter implements AIProviderPort {
  public readonly id: AIProviderId = "GEMINI";

  private readonly apiKey?: string;
  private readonly client?: GoogleGenAI;
  private readonly defaultModel: string;
  private readonly defaultTemperature?: number;
  private readonly defaultMaxTokens?: number;
  private readonly timeoutMs: number;
  private readonly thinkingConfig?: Record<string, unknown>;

  constructor(options: GeminiAdapterOptions = {}) {
    this.apiKey = options.apiKey;
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : undefined;
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.defaultTemperature = options.defaultTemperature;
    this.defaultMaxTokens = options.defaultMaxTokens;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.thinkingConfig = options.thinkingConfig;
  }

  public async generate(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    if (!this.client) {
      return fail(new DomainError("Missing GEMINI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
    }

    const model = resolveModel(request, this.defaultModel);
    const abortScope = this.createAbortScope(signal);

    try {
      const response = await this.client.models.generateContent({
        model,
        contents: request.prompt,
        config: this.buildConfig(request, abortScope.signal),
      });

      return ok({
        provider: this.id,
        model,
        text: typeof response.text === "string" ? response.text : "",
      });
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        return fail(new DomainError("Gemini request timeout", "AI_PROVIDER_TIMEOUT"));
      }

      return fail(new DomainError("Gemini upstream error", "AI_PROVIDER_UPSTREAM_ERROR"));
    } finally {
      abortScope.dispose();
    }
  }

  public async *stream(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    if (!this.client) {
      yield fail(new DomainError("Missing GEMINI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
      return;
    }

    const model = resolveModel(request, this.defaultModel);
    const abortScope = this.createAbortScope(signal);
    let hasTextChunks = false;

    try {
      const stream = await this.client.models.generateContentStream({
        model,
        contents: request.prompt,
        config: this.buildConfig(request, abortScope.signal),
      });

      let index = 0;

      for await (const chunk of stream) {
        const text = typeof chunk.text === "string" ? chunk.text : "";
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

        if (fallback.value.text.trim().length === 0) {
          yield fail(
            new DomainError("Gemini returned an empty response", "AI_PROVIDER_UPSTREAM_ERROR"),
          );
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
              "Gemini stream was interrupted after partial output",
              "AI_PROVIDER_TIMEOUT",
            ),
          );
          return;
        }

        yield fail(new DomainError("Gemini stream timeout", "AI_PROVIDER_TIMEOUT"));
        return;
      }

      if (hasTextChunks) {
        yield fail(
          new DomainError(
            "Gemini stream was interrupted after partial output",
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
    if (!this.client) {
      return fail(new DomainError("Missing GEMINI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
    }

    const abortScope = this.createAbortScope(undefined, timeoutMs ?? 5_000);

    try {
      await this.client.models.generateContent({
        model: this.defaultModel,
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        config: {
          maxOutputTokens: 1,
          abortSignal: abortScope.signal,
        },
      });

      return ok(undefined);
    } catch (error) {
      if (this.isAbortError(error) || abortScope.timedOut()) {
        return fail(new DomainError("Gemini connection test timeout", "AI_PROVIDER_TIMEOUT"));
      }

      const message = error instanceof Error ? error.message : "Internal Gemini Error";
      return fail(
        new DomainError(`Gemini connection failed: ${message}`, "AI_PROVIDER_UPSTREAM_ERROR"),
      );
    } finally {
      abortScope.dispose();
    }
  }

  private buildConfig(
    request: AIGenerationRequest,
    abortSignal: AbortSignal,
  ): Record<string, unknown> {
    const config: Record<string, unknown> = {
      abortSignal,
    };

    const temperature = resolveNumber(request.temperature, this.defaultTemperature);
    if (typeof temperature === "number") {
      config.temperature = temperature;
    }

    const maxTokens = resolveNumber(request.maxTokens, this.defaultMaxTokens);
    if (typeof maxTokens === "number") {
      config.maxOutputTokens = maxTokens;
    }

    if (request.responseFormat?.mimeType) {
      config.responseMimeType = request.responseFormat.mimeType;
    }

    if (request.responseFormat?.schema) {
      config.responseSchema = request.responseFormat.schema;
    }

    if (this.thinkingConfig) {
      config.thinkingConfig = this.thinkingConfig;
    }

    return config;
  }

  private createAbortScope(signal?: AbortSignal, overrideTimeoutMs?: number) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort("timeout"),
      overrideTimeoutMs ?? this.timeoutMs,
    );
    const timeoutSignal = controller.signal;

    if (!signal) {
      return {
        signal: timeoutSignal,
        timedOut: () => timeoutSignal.aborted,
        dispose: () => clearTimeout(timeout),
      };
    }

    const onAbort = () => {
      controller.abort();
      signal.removeEventListener("abort", onAbort);
    };

    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", onAbort);
    }

    return {
      signal: timeoutSignal,
      timedOut: () => timeoutSignal.aborted && !signal.aborted,
      dispose: () => {
        clearTimeout(timeout);
        signal.removeEventListener("abort", onAbort);
      },
    };
  }

  private isAbortError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === "AbortError" || error.message.toLowerCase().includes("abort"))
    );
  }
}
