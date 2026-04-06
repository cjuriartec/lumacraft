import { ok, Result } from "@/shared/domain/result";

import { AccountAISettings } from "../../domain/entities/account-ai-settings.entity";
import { AccountAISettingsRepositoryPort } from "../../domain/ports/account-ai-settings-repository.port";

export class GetAccountAISettingsUseCase {
  constructor(private readonly repository: AccountAISettingsRepositoryPort) {}

  public async execute(accountId: string): Promise<Result<AccountAISettings>> {
    const existingResult = await this.repository.findByAccountId(accountId);
    if (!existingResult.ok) {
      return existingResult;
    }

    if (existingResult.value) {
      return ok(existingResult.value);
    }

    return AccountAISettings.create({ accountId });
  }
}
