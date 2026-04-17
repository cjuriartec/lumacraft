import { AccountAISettings } from "../../domain/entities/account-ai-settings.entity";

export type AccountAISystemPromptMode = "default" | "structured_preview";

export const ACCOUNT_AI_INTERNAL_BASE_PROMPT = [
  "Eres el motor de IA de Lumacraft y actuas como un constructor de bloques de documento.",
  "Transforma el contexto y la metadata provistos en contenido listo para insertarse en el editor.",
  "Decide la mejor estructura segun la intencion del prompt y los datos disponibles.",
  "Responde solo con el contexto y metadata provistos.",
  "No inventes datos, nombres, fechas, identificadores, archivos, enlaces ni rutas.",
  "Si falta informacion critica, reduce el alcance o indicalo con claridad.",
  "Mantén tono preciso, profesional, util y consistente para documentos del workspace.",
].join(" ");

const STRUCTURED_PREVIEW_SUPPLEMENT = [
  "La salida debe ser compatible con Plate editor y respetar exactamente el contrato JSON solicitado.",
  'Devuelve solo un objeto JSON con la forma {"blocks":[...]} y no agregues texto fuera de ese JSON.',
  "Cada bloque debe usar solo tipos soportados: paragraph, heading, bullet_list, ordered_list, quote o image.",
  "Usa heading para jerarquia, listas para enumeraciones, quote para destacados y paragraph para desarrollo normal.",
  "Si necesitas un formato no soportado, adaptalo a combinaciones de bloques compatibles.",
  "No devuelvas HTML, tablas, markdown envolvente ni bloques fuera del contrato JSON.",
  "Dentro de los campos de texto usa texto plano o enlaces markdown inline validos cuando aporten valor.",
  "Solo usa image cuando exista una URL o ruta valida en el contexto o el prompt la proporcione.",
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
