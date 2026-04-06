import { BaseEntity } from "@/shared/domain/base-entity";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import {
  ACCOUNT_AI_DEFAULT_MAX_TOKENS,
  ACCOUNT_AI_DEFAULT_MODEL,
  ACCOUNT_AI_DEFAULT_PROVIDER,
  ACCOUNT_AI_DEFAULT_REQUEST_TIMEOUT_MS,
  ACCOUNT_AI_DEFAULT_SYSTEM_PROMPT,
  ACCOUNT_AI_DEFAULT_TEMPERATURE,
  ACCOUNT_AI_DEFAULT_TEMPLATE_PREVIEW_MAX_AI_BLOCKS,
  ACCOUNT_AI_DEFAULT_TEMPLATE_PREVIEW_TIMEOUT_MS,
  ACCOUNT_AI_PROVIDER_MODEL_CATALOG,
  buildDefaultAccountAIProviderOptions,
} from "../constants/account-ai-settings.constants";
import {
  AccountAIProviderOptions,
  AccountAIProviderSecrets,
} from "../types/account-ai-settings.types";
import { AI_PROVIDER_IDS, AIProviderId } from "../types/ai-provider.types";

interface AccountAISettingsProps {
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
  systemPrompt: string | null;
  providerOptions: AccountAIProviderOptions;
  providerSecrets: AccountAIProviderSecrets;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AccountAISettingsPatch {
  defaultProvider?: AIProviderId;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  requestTimeoutMs?: number;
  featureTemplateAI?: boolean;
  featureTemplateLogic?: boolean;
  templatePreviewTimeoutMs?: number;
  templatePreviewMaxAIBlocks?: number;
  systemPrompt?: string | null;
  providerOptions?: AccountAIProviderOptions;
  providerSecrets?: AccountAIProviderSecrets;
  updatedAt?: Date;
}

function normalizeAllowedModels(models: string[] | undefined, fallback: string[]): string[] {
  const source = Array.isArray(models) ? models : fallback;
  const normalized = source.map((model) => model.trim()).filter(Boolean);

  return Array.from(new Set(normalized));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeProviderOptions(
  options: AccountAIProviderOptions | undefined,
  defaultProvider: AIProviderId,
  defaultModel: string,
): AccountAIProviderOptions {
  const defaults = buildDefaultAccountAIProviderOptions();
  const normalized: AccountAIProviderOptions = {};

  for (const providerId of AI_PROVIDER_IDS) {
    const providerOptions = options?.[providerId];
    const fallbackModels = defaults[providerId]?.allowedModels ?? [];
    const allowedModels = normalizeAllowedModels(providerOptions?.allowedModels, fallbackModels);

    if (providerId === defaultProvider && !allowedModels.includes(defaultModel)) {
      allowedModels.unshift(defaultModel);
    }

    normalized[providerId] = {
      allowedModels,
      ...(isRecord(providerOptions?.thinkingConfig)
        ? {
            thinkingConfig: providerOptions?.thinkingConfig,
          }
        : {}),
    };
  }

  return normalized;
}

function normalizeProviderSecrets(
  providerSecrets: AccountAIProviderSecrets | undefined,
): AccountAIProviderSecrets {
  return AI_PROVIDER_IDS.reduce<AccountAIProviderSecrets>((accumulator, providerId) => {
    const providerSecret = providerSecrets?.[providerId];

    if (providerSecret) {
      accumulator[providerId] = { ...providerSecret };
    }

    return accumulator;
  }, {});
}

export class AccountAISettings extends BaseEntity {
  private readonly props: AccountAISettingsProps;

  private constructor(props: AccountAISettingsProps) {
    super(props.accountId, props.createdAt, props.updatedAt);
    this.props = props;
  }

  public get accountId(): string {
    return this.props.accountId;
  }

  public get defaultProvider(): AIProviderId {
    return this.props.defaultProvider;
  }

  public get defaultModel(): string {
    return this.props.defaultModel;
  }

  public get defaultTemperature(): number {
    return this.props.defaultTemperature;
  }

  public get defaultMaxTokens(): number {
    return this.props.defaultMaxTokens;
  }

  public get requestTimeoutMs(): number {
    return this.props.requestTimeoutMs;
  }

  public get featureTemplateAI(): boolean {
    return this.props.featureTemplateAI;
  }

  public get featureTemplateLogic(): boolean {
    return this.props.featureTemplateLogic;
  }

  public get templatePreviewTimeoutMs(): number {
    return this.props.templatePreviewTimeoutMs;
  }

  public get templatePreviewMaxAIBlocks(): number {
    return this.props.templatePreviewMaxAIBlocks;
  }

  public get systemPrompt(): string | null {
    return this.props.systemPrompt;
  }

  public get providerOptions(): AccountAIProviderOptions {
    return this.props.providerOptions;
  }

  public get providerSecrets(): AccountAIProviderSecrets {
    return this.props.providerSecrets;
  }

  public withPatch(patch: AccountAISettingsPatch): Result<AccountAISettings, DomainError> {
    return AccountAISettings.create({
      accountId: this.accountId,
      defaultProvider: patch.defaultProvider ?? this.defaultProvider,
      defaultModel: patch.defaultModel ?? this.defaultModel,
      defaultTemperature: patch.defaultTemperature ?? this.defaultTemperature,
      defaultMaxTokens: patch.defaultMaxTokens ?? this.defaultMaxTokens,
      requestTimeoutMs: patch.requestTimeoutMs ?? this.requestTimeoutMs,
      featureTemplateAI: patch.featureTemplateAI ?? this.featureTemplateAI,
      featureTemplateLogic: patch.featureTemplateLogic ?? this.featureTemplateLogic,
      templatePreviewTimeoutMs: patch.templatePreviewTimeoutMs ?? this.templatePreviewTimeoutMs,
      templatePreviewMaxAIBlocks:
        patch.templatePreviewMaxAIBlocks ?? this.templatePreviewMaxAIBlocks,
      systemPrompt: patch.systemPrompt !== undefined ? patch.systemPrompt : this.systemPrompt,
      providerOptions: patch.providerOptions ?? this.providerOptions,
      providerSecrets: patch.providerSecrets ?? this.providerSecrets,
      createdAt: this.createdAt,
      updatedAt: patch.updatedAt ?? new Date(),
    });
  }

  public static create(props: {
    accountId: string;
    defaultProvider?: AIProviderId;
    defaultModel?: string;
    defaultTemperature?: number;
    defaultMaxTokens?: number;
    requestTimeoutMs?: number;
    featureTemplateAI?: boolean;
    featureTemplateLogic?: boolean;
    templatePreviewTimeoutMs?: number;
    templatePreviewMaxAIBlocks?: number;
    systemPrompt?: string | null;
    providerOptions?: AccountAIProviderOptions;
    providerSecrets?: AccountAIProviderSecrets;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<AccountAISettings, DomainError> {
    if (!props.accountId.trim()) {
      return fail(new DomainError("Account AI settings require an accountId", "INVALID_INPUT"));
    }

    const defaultProvider = props.defaultProvider ?? ACCOUNT_AI_DEFAULT_PROVIDER;
    const defaultModel = props.defaultModel?.trim() || ACCOUNT_AI_DEFAULT_MODEL;
    const defaultTemperature = props.defaultTemperature ?? ACCOUNT_AI_DEFAULT_TEMPERATURE;
    const defaultMaxTokens = Math.round(props.defaultMaxTokens ?? ACCOUNT_AI_DEFAULT_MAX_TOKENS);
    const requestTimeoutMs = Math.round(
      props.requestTimeoutMs ?? ACCOUNT_AI_DEFAULT_REQUEST_TIMEOUT_MS,
    );
    const templatePreviewTimeoutMs = Math.round(
      props.templatePreviewTimeoutMs ?? ACCOUNT_AI_DEFAULT_TEMPLATE_PREVIEW_TIMEOUT_MS,
    );
    const templatePreviewMaxAIBlocks = Math.round(
      props.templatePreviewMaxAIBlocks ?? ACCOUNT_AI_DEFAULT_TEMPLATE_PREVIEW_MAX_AI_BLOCKS,
    );

    if (defaultTemperature < 0 || defaultTemperature > 2) {
      return fail(
        new DomainError(
          "defaultTemperature must be between 0 and 2",
          "ACCOUNT_AI_SETTINGS_INVALID_TEMPERATURE",
        ),
      );
    }

    if (defaultMaxTokens < 1) {
      return fail(
        new DomainError(
          "defaultMaxTokens must be greater than 0",
          "ACCOUNT_AI_SETTINGS_INVALID_MAX_TOKENS",
        ),
      );
    }

    if (requestTimeoutMs < 1_000) {
      return fail(
        new DomainError(
          "requestTimeoutMs must be at least 1000ms",
          "ACCOUNT_AI_SETTINGS_INVALID_TIMEOUT",
        ),
      );
    }

    if (templatePreviewTimeoutMs < 5_000) {
      return fail(
        new DomainError(
          "templatePreviewTimeoutMs must be at least 5000ms",
          "ACCOUNT_AI_SETTINGS_INVALID_PREVIEW_TIMEOUT",
        ),
      );
    }

    if (templatePreviewMaxAIBlocks < 1) {
      return fail(
        new DomainError(
          "templatePreviewMaxAIBlocks must be at least 1",
          "ACCOUNT_AI_SETTINGS_INVALID_AI_BLOCK_LIMIT",
        ),
      );
    }

    const providerOptions = normalizeProviderOptions(
      props.providerOptions,
      defaultProvider,
      defaultModel,
    );

    const providerCatalog = providerOptions[defaultProvider]?.allowedModels ?? [];
    const fallbackCatalog = ACCOUNT_AI_PROVIDER_MODEL_CATALOG[defaultProvider] ?? [];
    const supportedModels = providerCatalog.length > 0 ? providerCatalog : fallbackCatalog;

    if (supportedModels.length > 0 && !supportedModels.includes(defaultModel)) {
      return fail(
        new DomainError(
          `Default model "${defaultModel}" is not enabled for provider ${defaultProvider}`,
          "ACCOUNT_AI_SETTINGS_INVALID_MODEL",
        ),
      );
    }

    return ok(
      new AccountAISettings({
        accountId: props.accountId,
        defaultProvider,
        defaultModel,
        defaultTemperature,
        defaultMaxTokens,
        requestTimeoutMs,
        featureTemplateAI: props.featureTemplateAI ?? true,
        featureTemplateLogic: props.featureTemplateLogic ?? true,
        templatePreviewTimeoutMs,
        templatePreviewMaxAIBlocks,
        systemPrompt:
          props.systemPrompt === undefined
            ? ACCOUNT_AI_DEFAULT_SYSTEM_PROMPT
            : (props.systemPrompt ?? "").trim().length > 0
              ? props.systemPrompt
              : null,
        providerOptions,
        providerSecrets: normalizeProviderSecrets(props.providerSecrets),
        createdAt: props.createdAt ?? new Date(),
        updatedAt: props.updatedAt ?? new Date(),
      }),
    );
  }

  public toJSON() {
    return {
      accountId: this.accountId,
      defaultProvider: this.defaultProvider,
      defaultModel: this.defaultModel,
      defaultTemperature: this.defaultTemperature,
      defaultMaxTokens: this.defaultMaxTokens,
      requestTimeoutMs: this.requestTimeoutMs,
      featureTemplateAI: this.featureTemplateAI,
      featureTemplateLogic: this.featureTemplateLogic,
      templatePreviewTimeoutMs: this.templatePreviewTimeoutMs,
      templatePreviewMaxAIBlocks: this.templatePreviewMaxAIBlocks,
      systemPrompt: this.systemPrompt,
      providerOptions: this.providerOptions,
      providerSecrets: this.providerSecrets,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
