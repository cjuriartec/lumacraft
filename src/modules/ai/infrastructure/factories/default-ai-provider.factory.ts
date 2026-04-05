import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import { AIProviderFactoryPort } from "../../domain/ports/ai-provider-factory.port";
import { AIProviderId } from "../../domain/types/ai-provider.types";
import { AnthropicAdapterStub } from "../adapters/anthropic.adapter.stub";
import { GeminiAdapter } from "../adapters/gemini.adapter";
import { OpenAIAdapterStub } from "../adapters/openai.adapter.stub";

interface DefaultAIProviderFactoryOptions {
  geminiApiKey?: string;
  defaultProvider?: AIProviderId;
  defaultModel?: string;
  requestTimeoutMs?: number;
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
        timeoutMs,
      }),
      OPENAI: new OpenAIAdapterStub(),
      ANTHROPIC: new AnthropicAdapterStub(),
    };

    this.defaultProviderId = options.defaultProvider ?? "GEMINI";
  }

  public static fromEnv(env: NodeJS.ProcessEnv = process.env): DefaultAIProviderFactory {
    return new DefaultAIProviderFactory({
      geminiApiKey: env.GEMINI_API_KEY,
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
