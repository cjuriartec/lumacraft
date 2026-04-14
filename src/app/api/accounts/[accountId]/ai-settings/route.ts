import { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { AccountScopedAISettingsResolver } from "@/modules/ai/application/services/account-scoped-ai-settings-resolver";
import { AccountAISettingsDto } from "@/modules/ai/application/types/account-ai-settings.dto";
import { GetAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/get-account-ai-settings.use-case";
import { SaveAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/save-account-ai-settings.use-case";
import { AccountAISettings } from "@/modules/ai/domain/entities/account-ai-settings.entity";
import { type AccountAIProviderSecretSummaries } from "@/modules/ai/domain/types/account-ai-settings.types";
import { AI_PROVIDER_IDS } from "@/modules/ai/domain/types/ai-provider.types";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import {
  canDecryptSecret,
  encryptSecret,
} from "@/modules/ai/infrastructure/security/account-ai-settings-crypto";
import { resolveAccountAccess } from "@/shared/infrastructure/supabase/account-access";
import { createAdminClientOrNull } from "@/shared/infrastructure/supabase/admin";
import { createClient } from "@/shared/infrastructure/supabase/server";

const providerOptionSchema = z.object({
  allowedModels: z.array(z.string().min(1)).optional(),
  thinkingConfig: z.record(z.string(), z.unknown()).optional(),
});

const updateBodySchema = z.object({
  defaultProvider: z.enum(AI_PROVIDER_IDS),
  defaultModel: z.string().min(1),
  defaultTemperature: z.number().min(0).max(2),
  defaultMaxTokens: z.number().int().positive(),
  requestTimeoutMs: z.number().int().min(1_000),
  featureTemplateAI: z.boolean(),
  featureTemplateLogic: z.boolean(),
  templatePreviewTimeoutMs: z.number().int().min(5_000),
  templatePreviewMaxAIBlocks: z.number().int().min(1),
  systemPrompt: z.string(),
  enableFallback: z.boolean(),
  fallbackProvider: z.enum(AI_PROVIDER_IDS),
  fallbackModel: z.string().min(1),
  providerOptions: z.object({
    GEMINI: providerOptionSchema.optional(),
    OPENAI: providerOptionSchema.optional(),
    ANTHROPIC: providerOptionSchema.optional(),
  }),
  providerSecretsInput: z
    .object({
      GEMINI: z.string().optional(),
      OPENAI: z.string().optional(),
      ANTHROPIC: z.string().optional(),
    })
    .optional(),
  providerSecretsClear: z
    .object({
      GEMINI: z.boolean().optional(),
      OPENAI: z.boolean().optional(),
      ANTHROPIC: z.boolean().optional(),
    })
    .optional(),
});

interface RouteParams {
  params: Promise<{
    accountId: string;
  }>;
}

function toErrorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function getErrorCode(error: Error, fallback: string) {
  return "code" in error && typeof error.code === "string" ? error.code : fallback;
}

function buildRuntimeSecretSummaries(settings: AccountAISettings): AccountAIProviderSecretSummaries {
  return AI_PROVIDER_IDS.reduce<AccountAIProviderSecretSummaries>(
    (accumulator, providerId) => {
      const secret = settings.providerSecrets[providerId];
      const isReadable = secret ? canDecryptSecret(secret) : false;

      accumulator[providerId] = {
        isConfigured: isReadable,
        last4: isReadable ? secret?.last4 ?? null : null,
        updatedAt: isReadable ? secret?.updatedAt ?? null : null,
      };

      return accumulator;
    },
    {
      GEMINI: { isConfigured: false, last4: null, updatedAt: null },
      OPENAI: { isConfigured: false, last4: null, updatedAt: null },
      ANTHROPIC: { isConfigured: false, last4: null, updatedAt: null },
    },
  );
}

function toDto(settings: AccountAISettings): AccountAISettingsDto {
  return {
    accountId: settings.accountId,
    defaultProvider: settings.defaultProvider,
    defaultModel: settings.defaultModel,
    defaultTemperature: settings.defaultTemperature,
    defaultMaxTokens: settings.defaultMaxTokens,
    requestTimeoutMs: settings.requestTimeoutMs,
    featureTemplateAI: settings.featureTemplateAI,
    featureTemplateLogic: settings.featureTemplateLogic,
    templatePreviewTimeoutMs: settings.templatePreviewTimeoutMs,
    templatePreviewMaxAIBlocks: settings.templatePreviewMaxAIBlocks,
    systemPrompt: settings.systemPrompt ?? "",
    enableFallback: settings.enableFallback,
    fallbackProvider: settings.fallbackProvider,
    fallbackModel: settings.fallbackModel,
    providerOptions: settings.providerOptions,
    providerSecrets: buildRuntimeSecretSummaries(settings),
  };
}

function createRepositoryClient(supabase: SupabaseClient) {
  return createAdminClientOrNull() ?? supabase;
}

async function createResolver(supabase: SupabaseClient) {
  const repository = new SupabaseAccountAISettingsRepository(createRepositoryClient(supabase));

  return new AccountScopedAISettingsResolver(
    new GetAccountAISettingsUseCase(repository),
    new SaveAccountAISettingsUseCase(repository),
  );
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { accountId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return toErrorResponse(401, "UNAUTHORIZED", "Unauthorized");
  }

  const accessResult = await resolveAccountAccess(supabase, user.id, accountId);
  if (!accessResult.ok) {
    return toErrorResponse(
      500,
      getErrorCode(accessResult.error, "DB_ERROR"),
      accessResult.error.message,
    );
  }

  if (!accessResult.value.isMember) {
    return toErrorResponse(403, "FORBIDDEN", "You do not have access to this workspace");
  }

  const resolver = await createResolver(supabase);
  const resolvedSettings = await resolver.resolve(accountId, process.env, {
    persistBootstrap: accessResult.value.isAdmin,
  });

  if (!resolvedSettings.ok) {
    return toErrorResponse(
      500,
      getErrorCode(resolvedSettings.error, "ACCOUNT_AI_SETTINGS_ERROR"),
      resolvedSettings.error.message,
    );
  }

  return NextResponse.json({
    data: toDto(resolvedSettings.value.settings),
  });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { accountId } = await params;
  const bodyResult = updateBodySchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
    return toErrorResponse(
      400,
      "ACCOUNT_AI_SETTINGS_INVALID_INPUT",
      bodyResult.error.issues.map((issue) => issue.message).join("; "),
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return toErrorResponse(401, "UNAUTHORIZED", "Unauthorized");
  }

  const accessResult = await resolveAccountAccess(supabase, user.id, accountId);
  if (!accessResult.ok) {
    return toErrorResponse(
      500,
      getErrorCode(accessResult.error, "DB_ERROR"),
      accessResult.error.message,
    );
  }

  if (!accessResult.value.isOwner && !accessResult.value.isAdmin) {
    return toErrorResponse(
      403,
      "FORBIDDEN",
      "Only workspace owners or admins can update AI settings",
    );
  }

  const repository = new SupabaseAccountAISettingsRepository(createRepositoryClient(supabase));
  const resolver = new AccountScopedAISettingsResolver(
    new GetAccountAISettingsUseCase(repository),
    new SaveAccountAISettingsUseCase(repository),
  );

  const currentResult = await resolver.resolve(accountId, process.env, {
    persistBootstrap: true,
  });
  if (!currentResult.ok) {
    return toErrorResponse(
      500,
      getErrorCode(currentResult.error, "ACCOUNT_AI_SETTINGS_ERROR"),
      currentResult.error.message,
    );
  }

  const providerSecrets = { ...currentResult.value.settings.providerSecrets };

  for (const providerId of AI_PROVIDER_IDS) {
    const nextSecret = bodyResult.data.providerSecretsInput?.[providerId]?.trim();
    if (!nextSecret) {
      if (bodyResult.data.providerSecretsClear?.[providerId]) {
        delete providerSecrets[providerId];
      }
      continue;
    }

    const encryptedSecret = encryptSecret(nextSecret);
    if (!encryptedSecret.ok) {
      return toErrorResponse(
        500,
        getErrorCode(encryptedSecret.error, "AI_SECRET_ENCRYPTION_FAILED"),
        encryptedSecret.error.message,
      );
    }

    providerSecrets[providerId] = encryptedSecret.value;
  }

  const updatedSettingsResult = currentResult.value.settings.withPatch({
    defaultProvider: bodyResult.data.defaultProvider,
    defaultModel: bodyResult.data.defaultModel.trim(),
    defaultTemperature: bodyResult.data.defaultTemperature,
    defaultMaxTokens: bodyResult.data.defaultMaxTokens,
    requestTimeoutMs: bodyResult.data.requestTimeoutMs,
    featureTemplateAI: bodyResult.data.featureTemplateAI,
    featureTemplateLogic: bodyResult.data.featureTemplateLogic,
    templatePreviewTimeoutMs: bodyResult.data.templatePreviewTimeoutMs,
    templatePreviewMaxAIBlocks: bodyResult.data.templatePreviewMaxAIBlocks,
    systemPrompt: bodyResult.data.systemPrompt,
    enableFallback: bodyResult.data.enableFallback,
    fallbackProvider: bodyResult.data.fallbackProvider,
    fallbackModel: bodyResult.data.fallbackModel,
    providerOptions: bodyResult.data.providerOptions,
    providerSecrets,
    updatedAt: new Date(),
  });

  if (!updatedSettingsResult.ok) {
    return toErrorResponse(
      400,
      getErrorCode(updatedSettingsResult.error, "ACCOUNT_AI_SETTINGS_INVALID_INPUT"),
      updatedSettingsResult.error.message,
    );
  }

  const savedSettings = await repository.save(updatedSettingsResult.value);
  if (!savedSettings.ok) {
    return toErrorResponse(
      500,
      getErrorCode(savedSettings.error, "DB_ERROR"),
      savedSettings.error.message,
    );
  }

  return NextResponse.json({
    data: toDto(savedSettings.value),
  });
}
