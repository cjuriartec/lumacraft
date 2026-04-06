import { describe, expect, it } from "vitest";

import { composeAccountAISystemPrompt } from "@/modules/ai/application/services/account-ai-system-prompt";
import { AccountScopedAISettingsResolver } from "@/modules/ai/application/services/account-scoped-ai-settings-resolver";
import { GetAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/save-account-ai-settings.use-case";
import { ACCOUNT_AI_DEFAULT_SYSTEM_PROMPT } from "@/modules/ai/domain/constants/account-ai-settings.constants";
import { AccountAISettings } from "@/modules/ai/domain/entities/account-ai-settings.entity";
import { AccountAISettingsRepositoryPort } from "@/modules/ai/domain/ports/account-ai-settings-repository.port";
import { ok } from "@/shared/domain/result";

class InMemoryAccountAISettingsRepository implements AccountAISettingsRepositoryPort {
  constructor(private settings: AccountAISettings | null) {}

  public async findByAccountId() {
    return ok(this.settings);
  }

  public async createDefaults(accountId: string) {
    const created = AccountAISettings.create({ accountId });
    if (!created.ok) {
      throw created.error;
    }

    this.settings = created.value;
    return ok(created.value);
  }

  public async save(settings: AccountAISettings) {
    this.settings = settings;
    return ok(settings);
  }
}

describe("AccountScopedAISettingsResolver", () => {
  it("bootstraps legacy env config and decrypts provider secrets", async () => {
    const initialSettings = AccountAISettings.create({
      accountId: "account-1",
      systemPrompt: "Prioriza claridad contractual.",
    });
    if (!initialSettings.ok) {
      throw initialSettings.error;
    }

    const repository = new InMemoryAccountAISettingsRepository(initialSettings.value);
    const resolver = new AccountScopedAISettingsResolver(
      new GetAccountAISettingsUseCase(repository),
      new SaveAccountAISettingsUseCase(repository),
    );

    const result = await resolver.resolve("account-1", {
      AI_SETTINGS_MASTER_KEY: "master-key",
      GEMINI_API_KEY: "legacy-key-1234",
      AI_DEFAULT_MODEL: "gemini-2.5-flash",
      AI_REQUEST_TIMEOUT_MS: "27000",
      FEATURE_TEMPLATE_AI: "false",
      FEATURE_TEMPLATE_LOGIC: "true",
      TEMPLATE_PREVIEW_TIMEOUT_MS: "50000",
      TEMPLATE_PREVIEW_MAX_AI_BLOCKS: "4",
      NODE_ENV: "test",
    } as unknown as NodeJS.ProcessEnv);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.settings.defaultModel).toBe("gemini-2.5-flash");
    expect(result.value.settings.requestTimeoutMs).toBe(27000);
    expect(result.value.settings.featureTemplateAI).toBe(false);
    expect(result.value.settings.templatePreviewTimeoutMs).toBe(50000);
    expect(result.value.decryptedSecrets.GEMINI).toBe("legacy-key-1234");

    const provider = result.value.providerFactory.create();
    expect(provider.ok).toBe(true);
    if (!provider.ok) return;

    expect(provider.value.id).toBe("GEMINI");
  });

  it("composes internal, account and structured preview prompts", () => {
    const settings = AccountAISettings.create({
      accountId: "account-1",
      systemPrompt: "Responde con foco en compliance del workspace.",
    });
    if (!settings.ok) {
      throw settings.error;
    }

    const prompt = composeAccountAISystemPrompt({
      settings: settings.value,
      mode: "structured_preview",
    });

    expect(prompt).toContain("Lumacraft");
    expect(prompt).toContain("compliance del workspace");
    expect(prompt).toContain("contrato JSON");
  });

  it("creates defaults with a prefilled editable system prompt", async () => {
    const repository = new InMemoryAccountAISettingsRepository(null);
    const resolver = new AccountScopedAISettingsResolver(
      new GetAccountAISettingsUseCase(repository),
      new SaveAccountAISettingsUseCase(repository),
    );

    const result = await resolver.resolve("account-2", {
      AI_SETTINGS_MASTER_KEY: "master-key",
      NODE_ENV: "test",
    } as unknown as NodeJS.ProcessEnv);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.settings.systemPrompt).toBe(ACCOUNT_AI_DEFAULT_SYSTEM_PROMPT);
  });
});
