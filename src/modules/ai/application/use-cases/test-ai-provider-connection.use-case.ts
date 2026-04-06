import { DomainError, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";

export class TestAIProviderConnectionUseCase {
  public async execute(provider: AIProviderPort): Promise<Result<void, DomainError>> {
    return await provider.testConnection();
  }
}
