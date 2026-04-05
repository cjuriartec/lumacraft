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
  timeoutMs?: number;
}

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_TIMEOUT_MS = 25_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractTextFromGeminiPayload(payload: unknown): string {
  const candidates = isRecord(payload) ? payload.candidates : undefined;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  let text = "";

  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const content = candidate.content;
    if (!isRecord(content) || !Array.isArray(content.parts)) continue;

    for (const part of content.parts) {
      if (isRecord(part) && typeof part.text === "string") {
        text += part.text;
      }
    }
  }

  return text;
}

function resolveModel(request: AIGenerationRequest, fallbackModel: string): string {
  return request.model?.trim() || fallbackModel;
}

function buildRequestBody(request: AIGenerationRequest) {
  const generationConfig: Record<string, unknown> = {};

  if (typeof request.temperature === "number") {
    generationConfig.temperature = request.temperature;
  }

  if (typeof request.maxTokens === "number") {
    generationConfig.maxOutputTokens = request.maxTokens;
  }

  if (request.responseFormat?.mimeType) {
    generationConfig.responseMimeType = request.responseFormat.mimeType;
  }

  if (request.responseFormat?.schema) {
    generationConfig.responseSchema = request.responseFormat.schema;
  }

  return {
    contents: [
      {
        role: "user",
        parts: [{ text: request.prompt }],
      },
    ],
    generationConfig,
  };
}

function parseSseDataPayload(rawEvent: string): string | null {
  const dataLines = rawEvent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, ""));

  if (dataLines.length === 0) return null;

  const payload = dataLines.join("\n").trim();
  if (!payload || payload === "[DONE]") return null;

  return payload;
}

export class GeminiAdapter implements AIProviderPort {
  public readonly id: AIProviderId = "GEMINI";

  private readonly apiKey?: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor(options: GeminiAdapterOptions = {}) {
    this.apiKey = options.apiKey;
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  public async generate(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    if (!this.apiKey) {
      return fail(new DomainError("Missing GEMINI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
    }

    const model = resolveModel(request, this.defaultModel);

    try {
      const response = await this.executeWithTimeout(model, false, request, signal);

      if (!response.ok) {
        return fail(response.error);
      }

      const text = extractTextFromGeminiPayload(response.value);

      return ok({
        provider: this.id,
        model,
        text,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        return fail(error);
      }

      return fail(new DomainError("Gemini upstream error", "AI_PROVIDER_UPSTREAM_ERROR"));
    }
  }

  public async *stream(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    if (!this.apiKey) {
      yield fail(new DomainError("Missing GEMINI_API_KEY", "AI_PROVIDER_NOT_CONFIGURED"));
      return;
    }

    const model = resolveModel(request, this.defaultModel);

    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort("timeout"), this.timeoutMs);

    const mergedSignal = this.mergeSignals(signal, timeoutController.signal);
    let hasTextChunks = false;

    try {
      const endpoint = this.buildEndpoint(model, true);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(request)),
        signal: mergedSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        yield fail(
          new DomainError(
            `Gemini stream failed: ${response.status} ${errorText}`,
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
        return;
      }

      if (!response.body) {
        yield fail(
          new DomainError("Gemini stream returned empty body", "AI_PROVIDER_UPSTREAM_ERROR"),
        );
        return;
      }

      const decoder = new TextDecoder();
      const reader = response.body.getReader();

      let index = 0;
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const payloadText = parseSseDataPayload(rawEvent);
          if (!payloadText) {
            continue;
          }

          try {
            const payload = JSON.parse(payloadText) as unknown;
            const text = extractTextFromGeminiPayload(payload);

            if (!text) continue;

            hasTextChunks = true;
            yield ok({
              provider: this.id,
              model,
              index,
              text,
            });
            index += 1;
          } catch {
            // Ignore malformed chunk and continue stream.
          }
        }
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
      if (this.isAbortError(error) || timeoutController.signal.aborted) {
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
      clearTimeout(timeout);
    }
  }

  private async executeWithTimeout(
    model: string,
    stream: boolean,
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): Promise<Result<unknown, DomainError>> {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort("timeout"), this.timeoutMs);
    const mergedSignal = this.mergeSignals(signal, timeoutController.signal);

    try {
      const response = await fetch(this.buildEndpoint(model, stream), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildRequestBody(request)),
        signal: mergedSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return fail(
          new DomainError(
            `Gemini request failed: ${response.status} ${errorText}`,
            "AI_PROVIDER_UPSTREAM_ERROR",
          ),
        );
      }

      const payload = (await response.json()) as unknown;
      return ok(payload);
    } catch (error) {
      if (this.isAbortError(error) || timeoutController.signal.aborted) {
        return fail(new DomainError("Gemini request timeout", "AI_PROVIDER_TIMEOUT"));
      }

      return fail(new DomainError("Gemini upstream error", "AI_PROVIDER_UPSTREAM_ERROR"));
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildEndpoint(model: string, stream: boolean): string {
    const action = stream ? "streamGenerateContent" : "generateContent";
    const query = stream ? "alt=sse&" : "";

    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?${query}key=${this.apiKey}`;
  }

  private mergeSignals(primary?: AbortSignal, secondary?: AbortSignal): AbortSignal | undefined {
    if (!primary && !secondary) return undefined;
    if (!primary) return secondary;
    if (!secondary) return primary;

    const controller = new AbortController();

    const onAbort = () => {
      controller.abort();
      primary.removeEventListener("abort", onAbort);
      secondary.removeEventListener("abort", onAbort);
    };

    if (primary.aborted || secondary.aborted) {
      controller.abort();
      return controller.signal;
    }

    primary.addEventListener("abort", onAbort);
    secondary.addEventListener("abort", onAbort);

    return controller.signal;
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === "AbortError";
  }
}
