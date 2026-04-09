import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { AccountAISettings } from "../../domain/entities/account-ai-settings.entity";
import { AccountAISettingsRepositoryPort } from "../../domain/ports/account-ai-settings-repository.port";
import {
  AccountAIProviderOptions,
  AccountAIProviderSecrets,
} from "../../domain/types/account-ai-settings.types";

interface AccountAISettingsRow {
  account_id: string;
  default_provider: "GEMINI" | "OPENAI" | "ANTHROPIC";
  default_model: string;
  default_temperature: number;
  default_max_tokens: number;
  request_timeout_ms: number;
  feature_template_ai: boolean;
  feature_template_logic: boolean;
  template_preview_timeout_ms: number;
  template_preview_max_ai_blocks: number;
  system_prompt: string | null;
  enable_fallback: boolean;
  fallback_provider: "GEMINI" | "OPENAI" | "ANTHROPIC";
  fallback_model: string;
  provider_options: unknown;
  provider_secrets: unknown;
  created_at: string | null;
  updated_at: string | null;
}

export class SupabaseAccountAISettingsRepository
  extends BaseRepository
  implements AccountAISettingsRepositoryPort
{
  constructor(supabase: SupabaseClient) {
    super(supabase, "account_ai_settings");
  }

  public async findByAccountId(accountId: string): Promise<Result<AccountAISettings | null>> {
    const { data, error } = await this.table.select("*").eq("account_id", accountId).maybeSingle();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    if (!data) {
      return { ok: true, value: null };
    }

    return this.toEntityResult(data as AccountAISettingsRow);
  }

  public async createDefaults(accountId: string): Promise<Result<AccountAISettings>> {
    const { data, error } = await this.table
      .upsert({ account_id: accountId }, { onConflict: "account_id" })
      .select("*")
      .single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return this.toEntityResult(data as AccountAISettingsRow);
  }

  public async save(settings: AccountAISettings): Promise<Result<AccountAISettings>> {
    const payload = {
      account_id: settings.accountId,
      default_provider: settings.defaultProvider,
      default_model: settings.defaultModel,
      default_temperature: settings.defaultTemperature,
      default_max_tokens: settings.defaultMaxTokens,
      request_timeout_ms: settings.requestTimeoutMs,
      feature_template_ai: settings.featureTemplateAI,
      feature_template_logic: settings.featureTemplateLogic,
      template_preview_timeout_ms: settings.templatePreviewTimeoutMs,
      template_preview_max_ai_blocks: settings.templatePreviewMaxAIBlocks,
      system_prompt: settings.systemPrompt,
      enable_fallback: settings.enableFallback,
      fallback_provider: settings.fallbackProvider,
      fallback_model: settings.fallbackModel,
      provider_options: settings.providerOptions,
      provider_secrets: settings.providerSecrets,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.table
      .upsert(payload, { onConflict: "account_id" })
      .select("*")
      .single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return this.toEntityResult(data as AccountAISettingsRow);
  }

  private toEntityResult(row: AccountAISettingsRow): Result<AccountAISettings> {
    return AccountAISettings.create({
      accountId: row.account_id,
      defaultProvider: row.default_provider,
      defaultModel: row.default_model,
      defaultTemperature: row.default_temperature,
      defaultMaxTokens: row.default_max_tokens,
      requestTimeoutMs: row.request_timeout_ms,
      featureTemplateAI: row.feature_template_ai,
      featureTemplateLogic: row.feature_template_logic,
      templatePreviewTimeoutMs: row.template_preview_timeout_ms,
      templatePreviewMaxAIBlocks: row.template_preview_max_ai_blocks,
      systemPrompt: row.system_prompt,
      enableFallback: row.enable_fallback,
      fallbackProvider: row.fallback_provider,
      fallbackModel: row.fallback_model,
      providerOptions: (row.provider_options ?? {}) as AccountAIProviderOptions,
      providerSecrets: (row.provider_secrets ?? {}) as AccountAIProviderSecrets,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
    });
  }
}
