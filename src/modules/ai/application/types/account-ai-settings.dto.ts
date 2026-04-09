import {
  AccountAIProviderOptions,
  AccountAIProviderSecretSummaries,
} from "../../domain/types/account-ai-settings.types";
import { AIProviderId } from "../../domain/types/ai-provider.types";

export interface AccountAISettingsDto {
  accountId: string;
  defaultProvider: AIProviderId;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  requestTimeoutMs: number;
  featureTemplateAI: boolean;
  featureTemplateLogic: boolean;
  templatePreviewTimeoutMs: number;
  templatePreviewMaxAIBlocks: number;
  systemPrompt: string;
  enableFallback: boolean;
  fallbackProvider: AIProviderId;
  fallbackModel: string;
  providerOptions: AccountAIProviderOptions;
  providerSecrets: AccountAIProviderSecretSummaries;
}

export interface UpdateAccountAISettingsDto {
  defaultProvider: AIProviderId;
  defaultModel: string;
  defaultTemperature: number;
  defaultMaxTokens: number;
  requestTimeoutMs: number;
  featureTemplateAI: boolean;
  featureTemplateLogic: boolean;
  templatePreviewTimeoutMs: number;
  templatePreviewMaxAIBlocks: number;
  systemPrompt: string;
  enableFallback: boolean;
  fallbackProvider: AIProviderId;
  fallbackModel: string;
  providerOptions: AccountAIProviderOptions;
  providerSecretsInput?: Partial<Record<AIProviderId, string>>;
}
