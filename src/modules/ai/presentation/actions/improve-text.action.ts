"use server";

import { AccountScopedAISettingsResolver } from "@/modules/ai/application/services/account-scoped-ai-settings-resolver";
import { GetAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/get-account-ai-settings.use-case";
import { ImproveTextUseCase } from "@/modules/ai/application/use-cases/improve-text.use-case";
import { SaveAccountAISettingsUseCase } from "@/modules/ai/application/use-cases/save-account-ai-settings.use-case";
import { type AITone } from "@/modules/ai/domain/types/ai-tone";
import { SupabaseAccountAISettingsRepository } from "@/modules/ai/infrastructure/repositories/supabase-account-ai-settings.repository";
import { createClient } from "@/shared/infrastructure/supabase/server";

export async function improveTextAction(text: string, tone: AITone, accountId: string) {
  if (!text || text.trim().length === 0) {
    return { ok: false, error: "No hay texto para mejorar" };
  }

  const supabase = await createClient();
  const repository = new SupabaseAccountAISettingsRepository(supabase);
  const getSettings = new GetAccountAISettingsUseCase(repository);
  const saveSettings = new SaveAccountAISettingsUseCase(repository);
  const resolver = new AccountScopedAISettingsResolver(getSettings, saveSettings);

  const resolvedResult = await resolver.resolve(accountId);
  if (!resolvedResult.ok) {
    return { ok: false, error: "No se pudo cargar la configuración de IA" };
  }

  const { providerFactory } = resolvedResult.value;
  const providerResult = providerFactory.create();
  if (!providerResult.ok) {
    return { ok: false, error: "No se pudo inicializar el proveedor de IA" };
  }

  const useCase = new ImproveTextUseCase();
  const result = await useCase.execute({
    text,
    tone,
    provider: providerResult.value,
  });

  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }

  return { ok: true, data: result.value };
}
