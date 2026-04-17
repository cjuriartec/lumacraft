import { AccountAIProviderOptions } from "../types/account-ai-settings.types";
import { AIProviderId } from "../types/ai-provider.types";

export const ACCOUNT_AI_DEFAULT_PROVIDER = "GEMINI" as const;
export const ACCOUNT_AI_DEFAULT_MODEL = "gemini-2.0-flash";
export const ACCOUNT_AI_DEFAULT_TEMPERATURE = 0.2;
export const ACCOUNT_AI_DEFAULT_MAX_TOKENS = 300;
export const ACCOUNT_AI_DEFAULT_REQUEST_TIMEOUT_MS = 25_000;
export const ACCOUNT_AI_DEFAULT_TEMPLATE_PREVIEW_TIMEOUT_MS = 45_000;
export const ACCOUNT_AI_DEFAULT_TEMPLATE_PREVIEW_MAX_AI_BLOCKS = 3;
export const ACCOUNT_AI_DEFAULT_ENABLE_FALLBACK = false;
export const ACCOUNT_AI_DEFAULT_FALLBACK_PROVIDER = "OPENAI" as const;
export const ACCOUNT_AI_DEFAULT_FALLBACK_MODEL = "gpt-5.4-mini";
export const ACCOUNT_AI_DEFAULT_SYSTEM_PROMPT = [
  "Construye contenido listo para insertarse en documentos del workspace.",
  "Elige la estructura compatible que mejor resuelva la solicitud: parrafos, titulos, listas, citas, links inline o imagenes cuando el contexto los soporte.",
  "Prioriza claridad, jerarquia, consistencia terminologica y foco en los datos mas relevantes del registro.",
  "Si un formato no esta soportado, adaptalo a bloques compatibles sin perder utilidad.",
  "No inventes datos, nombres, fechas, identificadores, archivos, enlaces ni contexto adicional.",
].join(" ");

export const ACCOUNT_AI_PROVIDER_MODEL_CATALOG: Record<AIProviderId, string[]> = {
  GEMINI: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
  OPENAI: ["gpt-5.4-mini", "gpt-5.4", "gpt-5.2"],
  ANTHROPIC: ["claude-3-7-sonnet", "claude-3-5-sonnet", "claude-3-5-haiku"],
};

export function buildDefaultAccountAIProviderOptions(): AccountAIProviderOptions {
  return {
    GEMINI: {
      allowedModels: [...ACCOUNT_AI_PROVIDER_MODEL_CATALOG.GEMINI],
    },
    OPENAI: {
      allowedModels: [...ACCOUNT_AI_PROVIDER_MODEL_CATALOG.OPENAI],
    },
    ANTHROPIC: {
      allowedModels: [...ACCOUNT_AI_PROVIDER_MODEL_CATALOG.ANTHROPIC],
    },
  };
}
