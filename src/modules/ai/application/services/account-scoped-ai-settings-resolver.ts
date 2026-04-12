import "server-only";

import { DomainError, fail, Result } from "@/shared/domain/result";

import {
  AccountAISettings,
  AccountAISettingsPatch,
} from "../../domain/entities/account-ai-settings.entity";
import { AIProviderFactoryPort } from "../../domain/ports/ai-provider-factory.port";
import { AccountAIProviderSecrets } from "../../domain/types/account-ai-settings.types";
import { AI_PROVIDER_IDS, AIProviderId } from "../../domain/types/ai-provider.types";
import { DefaultAIProviderFactory } from "../../infrastructure/factories/default-ai-provider.factory";
import {
  decryptSecret,
  encryptSecret,
} from "../../infrastructure/security/account-ai-settings-crypto";
import { GetAccountAISettingsUseCase } from "../use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "../use-cases/save-account-ai-settings.use-case";

function readBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === "true" ? true : value.toLowerCase() === "false" ? false : fallback;
}

function hasConfiguredSecret(providerSecrets: AccountAIProviderSecrets): boolean {
  return AI_PROVIDER_IDS.some((providerId) => Boolean(providerSecrets[providerId]));
}

function createLegacyBootstrapPatch(
  current: AccountAISettings,
  env: NodeJS.ProcessEnv,
): Result<AccountAISettingsPatch | null, DomainError> {
  if (hasConfiguredSecret(current.providerSecrets)) {
    return { ok: true, value: null };
  }

  const legacyApiKey = env.GEMINI_API_KEY?.trim();
  if (!legacyApiKey) {
    return { ok: true, value: null };
  }

  const encryptedSecret = encryptSecret(legacyApiKey, env);
  if (!encryptedSecret.ok) {
    return encryptedSecret;
  }

  return {
    ok: true,
    value: {
      defaultProvider:
        env.AI_DEFAULT_PROVIDER === "OPENAI" || env.AI_DEFAULT_PROVIDER === "ANTHROPIC"
          ? (env.AI_DEFAULT_PROVIDER as AIProviderId)
          : "GEMINI",
      defaultModel: env.AI_DEFAULT_MODEL?.trim() || current.defaultModel,
      requestTimeoutMs: Number(env.AI_REQUEST_TIMEOUT_MS ?? current.requestTimeoutMs),
      featureTemplateAI: readBooleanEnv(env.FEATURE_TEMPLATE_AI, current.featureTemplateAI),
      featureTemplateLogic: readBooleanEnv(
        env.FEATURE_TEMPLATE_LOGIC,
        current.featureTemplateLogic,
      ),
      templatePreviewTimeoutMs: Number(
        env.TEMPLATE_PREVIEW_TIMEOUT_MS ?? current.templatePreviewTimeoutMs,
      ),
      templatePreviewMaxAIBlocks: Number(
        env.TEMPLATE_PREVIEW_MAX_AI_BLOCKS ?? current.templatePreviewMaxAIBlocks,
      ),
      providerSecrets: {
        ...current.providerSecrets,
        GEMINI: encryptedSecret.value,
      },
      updatedAt: new Date(),
    },
  };
}

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
    private readonly saveSettingsUseCase: SaveAccountAISettingsUseCase,
  ) {}

  public async resolve(
    accountId: string,
    env: NodeJS.ProcessEnv = process.env,
    options: {
      persistBootstrap?: boolean;
    } = {},
  ): Promise<Result<ResolvedAccountAISettings, DomainError>> {
    const persistBootstrap = options.persistBootstrap ?? true;
    const settingsResult = await this.getSettingsUseCase.execute(accountId);
    if (!settingsResult.ok) {
      return settingsResult;
    }

    let settings = settingsResult.value;

    const bootstrapPatchResult = createLegacyBootstrapPatch(settings, env);
    if (!bootstrapPatchResult.ok) {
      return fail(bootstrapPatchResult.error);
    }

    if (bootstrapPatchResult.value) {
      const bootstrappedSettingsResult = settings.withPatch(bootstrapPatchResult.value);
      if (!bootstrappedSettingsResult.ok) {
        return fail(bootstrappedSettingsResult.error);
      }

      if (!persistBootstrap) {
        settings = bootstrappedSettingsResult.value;
      } else {
        const persistedBootstrappedSettings = await this.saveSettingsUseCase.execute(
          bootstrappedSettingsResult.value,
        );
        if (!persistedBootstrappedSettings.ok) {
          return persistedBootstrappedSettings;
        }

        settings = persistedBootstrappedSettings.value;
      }
    }

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
