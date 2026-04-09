import { DomainError, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../../domain/types/ai-provider.types";

interface FallbackAIProviderOptions {
  enableFallback: boolean;
  onFallback?: (error: DomainError, fallbackProviderId: AIProviderId) => void;
}

/**
 * Decorator that implements fallback logic between two AI providers.
 * If the primary provider fails, it automatically retries with the fallback provider.
 */
export class FallbackAIProviderDecorator implements AIProviderPort {
  constructor(
    private readonly primary: AIProviderPort,
    private readonly fallback: AIProviderPort,
    private readonly options: FallbackAIProviderOptions,
  ) {}

  public get id(): AIProviderId {
    return this.primary.id;
  }

  public async generate(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    const result = await this.primary.generate(request, signal);

    if (result.ok || !this.options.enableFallback) {
      return result;
    }

    // Try fallback
    this.options.onFallback?.(result.error, this.fallback.id);
    return this.fallback.generate(request, signal);
  }

  public async *stream(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    // For streaming, fallback is harder because content might have already been sent.
    // However, if the first chunk fails, we can fallback.

    let started = false;
    try {
      for await (const chunk of this.primary.stream(request, signal)) {
        started = true;
        yield chunk;
      }
    } catch (e) {
      if (!started && this.options.enableFallback) {
        const error = e instanceof DomainError ? e : new DomainError(String(e), "STREAM_ERROR");
        this.options.onFallback?.(error, this.fallback.id);
        yield* this.fallback.stream(request, signal);
      } else {
        throw e;
      }
    }
  }

  public async testConnection(timeoutMs?: number): Promise<Result<void, DomainError>> {
    // Test primary only
    return this.primary.testConnection(timeoutMs);
  }
}
