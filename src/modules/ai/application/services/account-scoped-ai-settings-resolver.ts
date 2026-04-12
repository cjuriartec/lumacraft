import "server-only";

import { DomainError, Result } from "@/shared/domain/result";

import { AccountAISettings } from "../../domain/entities/account-ai-settings.entity";
import { AIProviderFactoryPort } from "../../domain/ports/ai-provider-factory.port";
import { AI_PROVIDER_IDS, AIProviderId } from "../../domain/types/ai-provider.types";
import { DefaultAIProviderFactory } from "../../infrastructure/factories/default-ai-provider.factory";
import { decryptSecret } from "../../infrastructure/security/account-ai-settings-crypto";
import { GetAccountAISettingsUseCase } from "../use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "../use-cases/save-account-ai-settings.use-case";

export interface ResolvedAccountAISettings {
  settings: AccountAISettings;
  providerFactory: AIProviderFactoryPort;
  decryptedSecrets: Partial<Record<AIProviderId, string>>;
}

interface CachedResolvedAccountAISettings {
  expiresAt: number;
  value: ResolvedAccountAISettings;
}

const RESOLVED_SETTINGS_CACHE_TTL_MS = 30_000;
const resolvedAccountSettingsCache = new Map<string, CachedResolvedAccountAISettings>();

export class AccountScopedAISettingsResolver {
  constructor(
    private readonly getSettingsUseCase: GetAccountAISettingsUseCase,
    private readonly _saveSettingsUseCase: SaveAccountAISettingsUseCase,
  ) {}

  public async resolve(
    accountId: string,
    env: NodeJS.ProcessEnv = process.env,
    _options: {
      persistBootstrap?: boolean;
    } = {},
  ): Promise<Result<ResolvedAccountAISettings, DomainError>> {
    const settingsResult = await this.getSettingsUseCase.execute(accountId);
    if (!settingsResult.ok) {
      return settingsResult;
    }

    const settings = settingsResult.value;

    const cacheKey = `${accountId}:${settings.updatedAt?.toISOString() ?? "bootstrap"}`;
    const cached = resolvedAccountSettingsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        ok: true,
        value: {
          settings,
          providerFactory: cached.value.providerFactory,
          decryptedSecrets: cached.value.decryptedSecrets,
        },
      };
    }

    const decryptedSecrets: Partial<Record<AIProviderId, string>> = {};

    for (const providerId of AI_PROVIDER_IDS) {
      const providerSecret = settings.providerSecrets[providerId];
      if (!providerSecret) {
        continue;
      }

      const decryptedSecretResult = decryptSecret(providerSecret, env);
      if (!decryptedSecretResult.ok) {
        // If decryption fails (e.g. changed master key), we ignore it instead of failing the resolution.
        // This prevents a deadlock where the user can't fix their settings because they can't be resolved.
        console.warn(
          `Failed to decrypt AI secret for provider ${providerId} in account ${accountId}: ${decryptedSecretResult.error.message}`,
        );
        continue;
      }

      decryptedSecrets[providerId] = decryptedSecretResult.value;
    }

    const resolvedValue: ResolvedAccountAISettings = {
      settings,
      providerFactory: new DefaultAIProviderFactory({
        defaultProvider: settings.defaultProvider,
        defaultModel: settings.defaultModel,
        defaultTemperature: settings.defaultTemperature,
        defaultMaxTokens: settings.defaultMaxTokens,
        requestTimeoutMs: settings.requestTimeoutMs,
        providerOptions: settings.providerOptions,
        geminiApiKey: decryptedSecrets.GEMINI,
        openaiApiKey: decryptedSecrets.OPENAI,
        anthropicApiKey: decryptedSecrets.ANTHROPIC,
      }),
      decryptedSecrets,
    };

    resolvedAccountSettingsCache.set(cacheKey, {
      expiresAt: Date.now() + RESOLVED_SETTINGS_CACHE_TTL_MS,
      value: resolvedValue,
    });

    return {
      ok: true,
      value: resolvedValue,
    };
  }
}
