import { DomainError, Result } from "@/shared/domain/result";

import { AIProviderId } from "../types/ai-provider.types";
import { AIProviderPort } from "./ai-provider.port";

export interface AIProviderFactoryPort {
  getDefaultProviderId(): AIProviderId;
  create(providerId?: AIProviderId): Result<AIProviderPort, DomainError>;
}
