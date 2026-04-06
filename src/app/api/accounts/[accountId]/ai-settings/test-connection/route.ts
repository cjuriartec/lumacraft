import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { TestAIProviderConnectionUseCase } from "@/modules/ai/application/use-cases/test-ai-provider-connection.use-case";
import { AI_PROVIDER_IDS, AIProviderId } from "@/modules/ai/domain/types/ai-provider.types";
import { GeminiAdapter } from "@/modules/ai/infrastructure/adapters/gemini.adapter";
import { AnthropicAdapterStub } from "@/modules/ai/infrastructure/adapters/anthropic.adapter.stub";
import { OpenAIAdapterStub } from "@/modules/ai/infrastructure/adapters/openai.adapter.stub";
import { encryptSecret, decryptSecret } from "@/modules/ai/infrastructure/security/account-ai-settings-crypto";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import { createAdminClientOrNull } from "@/shared/infrastructure/supabase/admin";
import { resolveAccountAccess } from "@/shared/infrastructure/supabase/account-access";
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
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  const accessResult = await resolveAccountAccess(supabase, user.id, accountId);
  if (!accessResult.ok || !accessResult.value.isMember) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 });
  }

  let finalApiKey = inputApiKey;

  // If no API key is provided, try to use the stored one
  if (!finalApiKey) {
    const adminClient = createAdminClientOrNull() ?? supabase;
    const repository = new SupabaseAccountAISettingsRepository(adminClient);
    const settingsResult = await repository.findByAccountId(accountId);
    
    if (settingsResult.ok && settingsResult.value) {
      const encrypted = settingsResult.value.providerSecrets[providerId];
      if (encrypted) {
        const decrypted = decryptSecret(encrypted);
        if (decrypted.ok) {
          finalApiKey = decrypted.value;
        }
      }
    }
  }

  if (!finalApiKey) {
    return NextResponse.json(
      { error: { code: "MISSING_API_KEY", message: "No API key provided or found" } },
      { status: 400 },
    );
  }

  // Create adapter based on provider
  let adapter;
  switch (providerId) {
    case "GEMINI":
      adapter = new GeminiAdapter({ apiKey: finalApiKey });
      break;
    case "OPENAI":
      adapter = new OpenAIAdapterStub();
      break;
    case "ANTHROPIC":
      adapter = new AnthropicAdapterStub();
      break;
    default:
      return NextResponse.json({ error: { code: "INVALID_PROVIDER", message: "Invalid provider" } }, { status: 400 });
  }

  const useCase = new TestAIProviderConnectionUseCase();
  const result = await useCase.execute(adapter);

  if (!result.ok) {
    return NextResponse.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json({ data: { success: true } });
}
