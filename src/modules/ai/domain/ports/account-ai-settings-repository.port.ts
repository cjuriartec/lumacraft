import { DomainError, Result } from "@/shared/domain/result";

import { AccountAISettings } from "../entities/account-ai-settings.entity";

export interface AccountAISettingsRepositoryPort {
  findByAccountId(accountId: string): Promise<Result<AccountAISettings | null, DomainError>>;
  createDefaults(accountId: string): Promise<Result<AccountAISettings, DomainError>>;
  save(settings: AccountAISettings): Promise<Result<AccountAISettings, DomainError>>;
}
