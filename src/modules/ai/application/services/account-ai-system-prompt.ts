import { AccountAISettings } from "../../domain/entities/account-ai-settings.entity";

export type AccountAISystemPromptMode = "default" | "structured_preview";

export const ACCOUNT_AI_INTERNAL_BASE_PROMPT = [
  "Eres el motor de IA de Lumacraft.",
  "Responde solo con el contexto y metadata provistos.",
  "No inventes datos, nombres, fechas ni identificadores.",
  "Si falta informacion, indicalo con claridad.",
  "Mantén tono preciso, profesional y util para documentos del workspace.",
].join(" ");

const STRUCTURED_PREVIEW_SUPPLEMENT = [
  "La salida debe ser compatible con Plate editor.",
  "No devuelvas HTML.",
  "Respeta el contrato JSON solicitado y no agregues texto fuera de ese JSON.",
].join(" ");

export function composeAccountAISystemPrompt(params: {
  settings: AccountAISettings;
  mode?: AccountAISystemPromptMode;
}): string {
  const sections = [ACCOUNT_AI_INTERNAL_BASE_PROMPT];

  if (params.settings.systemPrompt?.trim()) {
    sections.push(params.settings.systemPrompt.trim());
  }

  if (params.mode === "structured_preview") {
    sections.push(STRUCTURED_PREVIEW_SUPPLEMENT);
  }

  return sections.join("\n\n");
}
