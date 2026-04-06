import { DomainError, fail, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../../domain/types/ai-provider.types";

export class AnthropicAdapterStub implements AIProviderPort {
  public readonly id: AIProviderId = "ANTHROPIC";

  public async generate(
    _request: AIGenerationRequest,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    return fail(new DomainError("Anthropic adapter is not implemented yet", "NOT_IMPLEMENTED"));
  }

  public async *stream(
    _request: AIGenerationRequest,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    yield fail(new DomainError("Anthropic adapter is not implemented yet", "NOT_IMPLEMENTED"));
  }

  public async testConnection(): Promise<Result<void, DomainError>> {
    return fail(new DomainError("Anthropic adapter is not implemented yet", "NOT_IMPLEMENTED"));
  }
}
