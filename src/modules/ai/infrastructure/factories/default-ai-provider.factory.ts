import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import { AIProviderFactoryPort } from "../../domain/ports/ai-provider-factory.port";
import { AccountAIProviderOptions } from "../../domain/types/account-ai-settings.types";
import { AIProviderId } from "../../domain/types/ai-provider.types";
import { AnthropicAdapter } from "../adapters/anthropic.adapter";
import { GeminiAdapter } from "../adapters/gemini.adapter";
import { OpenAIAdapter } from "../adapters/openai.adapter";

interface DefaultAIProviderFactoryOptions {
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultProvider?: AIProviderId;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  requestTimeoutMs?: number;
  providerOptions?: AccountAIProviderOptions;
}

function normalizeProvider(raw: string | undefined): AIProviderId {
  switch ((raw ?? "GEMINI").toUpperCase()) {
    case "OPENAI":
      return "OPENAI";
    case "ANTHROPIC":
      return "ANTHROPIC";
    case "GEMINI":
    default:
      return "GEMINI";
  }
}

export class DefaultAIProviderFactory implements AIProviderFactoryPort {
  private readonly providers: Record<AIProviderId, AIProviderPort>;
  private readonly defaultProviderId: AIProviderId;

  constructor(options: DefaultAIProviderFactoryOptions = {}) {
    const timeoutMs = options.requestTimeoutMs ?? 25_000;
    const defaultModel = options.defaultModel ?? "gemini-2.0-flash";

    this.providers = {
      GEMINI: new GeminiAdapter({
        apiKey: options.geminiApiKey,
        defaultModel,
        defaultTemperature: options.defaultTemperature,
        defaultMaxTokens: options.defaultMaxTokens,
        timeoutMs,
        thinkingConfig: options.providerOptions?.GEMINI?.thinkingConfig,
      }),
      OPENAI: new OpenAIAdapter({
        apiKey: options.openaiApiKey,
        defaultModel:
          options.providerOptions?.OPENAI?.allowedModels?.[0] ??
          options.defaultModel ??
          "gpt-5.4-mini",
        defaultTemperature: options.defaultTemperature,
        defaultMaxTokens: options.defaultMaxTokens,
        timeoutMs,
      }),
      ANTHROPIC: new AnthropicAdapter({
        apiKey: options.anthropicApiKey,
        defaultModel:
          options.providerOptions?.ANTHROPIC?.allowedModels?.[0] ??
          options.defaultModel ??
          "claude-3-7-sonnet",
        defaultTemperature: options.defaultTemperature,
        defaultMaxTokens: options.defaultMaxTokens,
        timeoutMs,
      }),
    };

    this.defaultProviderId = options.defaultProvider ?? "GEMINI";
  }

  public static fromEnv(env: NodeJS.ProcessEnv = process.env): DefaultAIProviderFactory {
    return new DefaultAIProviderFactory({
      geminiApiKey: env.GEMINI_API_KEY,
      openaiApiKey: env.OPENAI_API_KEY,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      defaultProvider: normalizeProvider(env.AI_DEFAULT_PROVIDER),
      defaultModel: env.AI_DEFAULT_MODEL ?? "gemini-2.0-flash",
      requestTimeoutMs: Number(env.AI_REQUEST_TIMEOUT_MS ?? 25_000),
    });
  }

  public getDefaultProviderId(): AIProviderId {
    return this.defaultProviderId;
  }

  public create(providerId?: AIProviderId): Result<AIProviderPort, DomainError> {
    const resolvedId = providerId ?? this.defaultProviderId;
    const provider = this.providers[resolvedId];

    if (!provider) {
      return fail(
        new DomainError(`Unsupported AI provider: ${resolvedId}`, "AI_PROVIDER_NOT_SUPPORTED"),
      );
    }

    return ok(provider);
  }
}
