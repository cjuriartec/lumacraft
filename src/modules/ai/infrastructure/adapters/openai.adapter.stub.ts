import { DomainError, fail, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
  AIProviderId,
} from "../../domain/types/ai-provider.types";

export class OpenAIAdapterStub implements AIProviderPort {
  public readonly id: AIProviderId = "OPENAI";

  public async generate(
    _request: AIGenerationRequest,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    return fail(new DomainError("OpenAI adapter is not implemented yet", "NOT_IMPLEMENTED"));
  }

  public async *stream(
    _request: AIGenerationRequest,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    yield fail(new DomainError("OpenAI adapter is not implemented yet", "NOT_IMPLEMENTED"));
  }
}
