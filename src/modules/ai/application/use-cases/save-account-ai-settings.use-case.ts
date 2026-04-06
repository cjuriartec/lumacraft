import { Result } from "@/shared/domain/result";

import { AccountAISettings } from "../../domain/entities/account-ai-settings.entity";
import { AccountAISettingsRepositoryPort } from "../../domain/ports/account-ai-settings-repository.port";

export class SaveAccountAISettingsUseCase {
  constructor(private readonly repository: AccountAISettingsRepositoryPort) {}

  public async execute(settings: AccountAISettings): Promise<Result<AccountAISettings>> {
    return this.repository.save(settings);
  }
}
