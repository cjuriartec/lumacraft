import { AI_PROVIDER_IDS, AIProviderId } from "./ai-provider.types";

export const ACCOUNT_AI_SECRET_ALGORITHM = "aes-256-gcm" as const;
export const ACCOUNT_AI_SECRET_VERSION = 1 as const;

export type AccountAISecretAlgorithm = typeof ACCOUNT_AI_SECRET_ALGORITHM;

export interface AccountAIEncryptedSecretEnvelope {
  algorithm: AccountAISecretAlgorithm;
  version: number;
  iv: string;
  tag: string;
  ciphertext: string;
  last4: string;
  updatedAt: string;
}

export interface AccountAIProviderOptionConfig {
  allowedModels?: string[];
  thinkingConfig?: Record<string, unknown>;
}

export type AccountAIProviderOptions = Partial<Record<AIProviderId, AccountAIProviderOptionConfig>>;

export type AccountAIProviderSecrets = Partial<
  Record<AIProviderId, AccountAIEncryptedSecretEnvelope>
>;

export interface AccountAIProviderSecretSummary {
  isConfigured: boolean;
  last4: string | null;
  updatedAt: string | null;
}

export type AccountAIProviderSecretSummaries = Record<AIProviderId, AccountAIProviderSecretSummary>;

export function buildProviderSecretSummaries(
  providerSecrets: AccountAIProviderSecrets,
): AccountAIProviderSecretSummaries {
  return AI_PROVIDER_IDS.reduce<AccountAIProviderSecretSummaries>(
    (accumulator, providerId) => {
      const secret = providerSecrets[providerId];

      accumulator[providerId] = {
        isConfigured: Boolean(secret),
        last4: secret?.last4 ?? null,
        updatedAt: secret?.updatedAt ?? null,
      };

      return accumulator;
    },
    {
      GEMINI: {
        isConfigured: false,
        last4: null,
        updatedAt: null,
      },
      OPENAI: {
        isConfigured: false,
        last4: null,
        updatedAt: null,
      },
      ANTHROPIC: {
        isConfigured: false,
        last4: null,
        updatedAt: null,
      },
    },
  );
}
