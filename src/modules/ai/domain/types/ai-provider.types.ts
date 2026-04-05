export const AI_PROVIDER_IDS = ["GEMINI", "OPENAI", "ANTHROPIC"] as const;

export type AIProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AIGenerationRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  groundingContext?: string;
  metadata?: Record<string, unknown>;
  responseFormat?: {
    mimeType?: "application/json" | "text/plain";
    schema?: Record<string, unknown>;
  };
}

export interface AIGenerationChunk {
  provider: AIProviderId;
  model: string;
  index: number;
  text: string;
}

export interface AIGenerationUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AIGenerationResponse {
  provider: AIProviderId;
  model: string;
  text: string;
  usage?: AIGenerationUsage;
}
