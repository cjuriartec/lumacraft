import { DomainError, Result } from "@/shared/domain/result";

import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../types/ai-provider.types";

export interface AIProviderPort {
  readonly id: AIProviderId;

  generate(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): Promise<Result<AIGenerationResponse, DomainError>>;

  stream(
    request: AIGenerationRequest,
    signal?: AbortSignal,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void>;

  testConnection(timeoutMs?: number): Promise<Result<void, DomainError>>;
}
