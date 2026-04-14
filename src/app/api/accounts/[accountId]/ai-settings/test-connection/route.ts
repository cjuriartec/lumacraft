import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { TestAIProviderConnectionUseCase } from "@/modules/ai/application/use-cases/test-ai-provider-connection.use-case";
import { AI_PROVIDER_IDS } from "@/modules/ai/domain/types/ai-provider.types";
import { DefaultAIProviderFactory } from "@/modules/ai/infrastructure/factories/default-ai-provider.factory";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import { decryptSecret } from "@/modules/ai/infrastructure/security/account-ai-settings-crypto";
import { resolveAccountAccess } from "@/shared/infrastructure/supabase/account-access";
import { createAdminClientOrNull } from "@/shared/infrastructure/supabase/admin";
import { createClient } from "@/shared/infrastructure/supabase/server";

const bodySchema = z.object({
  providerId: z.enum(AI_PROVIDER_IDS),
  apiKey: z.string().optional(),
});

interface RouteParams {
  params: Promise<{
    accountId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { accountId } = await params;
  const bodyResult = bodySchema.safeParse(await request.json().catch(() => null));

  if (!bodyResult.success) {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: bodyResult.error.issues[0].message } },
      { status: 400 },
    );
  }

  const { providerId, apiKey: inputApiKey } = bodyResult.data;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
      { status: 401 },
    );
  }

  const accessResult = await resolveAccountAccess(supabase, user.id, accountId);
  if (!accessResult.ok || !accessResult.value.isMember) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Forbidden" } },
      { status: 403 },
    );
  }

  let finalApiKey = inputApiKey;
  let currentSettings = null;
  const adminClient = createAdminClientOrNull() ?? supabase;
  const repository = new SupabaseAccountAISettingsRepository(adminClient);
  const settingsResult = await repository.findByAccountId(accountId);

  if (settingsResult.ok) {
    currentSettings = settingsResult.value;
  }

  // If no API key is provided, try to use the stored one
  if (!finalApiKey && currentSettings) {
    const encrypted = currentSettings.providerSecrets[providerId];
    if (encrypted) {
      const decrypted = decryptSecret(encrypted);
      if (decrypted.ok) {
        finalApiKey = decrypted.value;
      } else {
        return NextResponse.json(
          {
            error: {
              code: decrypted.error.code,
              message:
                "La API key almacenada no pudo descifrarse. Verifica AI_SETTINGS_MASTER_KEY o vuelve a guardar la key del proveedor.",
            },
          },
          { status: 400 },
        );
      }
    }
  }

  if (!finalApiKey) {
    return NextResponse.json(
      { error: { code: "MISSING_API_KEY", message: "No API key provided or found" } },
      { status: 400 },
    );
  }

  const decryptedSecrets = {
    GEMINI: undefined as string | undefined,
    OPENAI: undefined as string | undefined,
    ANTHROPIC: undefined as string | undefined,
  };

  if (currentSettings) {
    for (const currentProviderId of AI_PROVIDER_IDS) {
      const encrypted = currentSettings.providerSecrets[currentProviderId];
      if (!encrypted) {
        continue;
      }

      const decrypted = decryptSecret(encrypted);
      if (decrypted.ok) {
        decryptedSecrets[currentProviderId] = decrypted.value;
      }
    }
  }

  decryptedSecrets[providerId] = finalApiKey;

  const factory = new DefaultAIProviderFactory({
    defaultProvider: currentSettings?.defaultProvider ?? providerId,
    defaultModel: currentSettings?.defaultModel,
    defaultTemperature: currentSettings?.defaultTemperature,
    defaultMaxTokens: currentSettings?.defaultMaxTokens,
    requestTimeoutMs: currentSettings?.requestTimeoutMs,
    providerOptions: currentSettings?.providerOptions,
    geminiApiKey: decryptedSecrets.GEMINI,
    openaiApiKey: decryptedSecrets.OPENAI,
    anthropicApiKey: decryptedSecrets.ANTHROPIC,
  });

  const adapterResult = factory.create(providerId);
  if (!adapterResult.ok) {
    return NextResponse.json(
      { error: { code: adapterResult.error.code, message: adapterResult.error.message } },
      { status: 400 },
    );
  }

  const useCase = new TestAIProviderConnectionUseCase();
  const result = await useCase.execute(adapterResult.value);

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json({ data: { success: true } });
}
