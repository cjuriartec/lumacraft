import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import { AIProviderFactoryPort } from "../../domain/ports/ai-provider-factory.port";
import { AccountAIProviderOptions } from "../../domain/types/account-ai-settings.types";
import { AIProviderId } from "../../domain/types/ai-provider.types";
import { EdgeFunctionAIProviderAdapter } from "../adapters/edge-function-ai-provider.adapter";
import { FallbackAIProviderDecorator } from "../decorators/fallback-ai-provider.decorator";

interface EdgeFunctionAIProviderFactoryOptions {
  accountId: string;
  functionUrl: string;
  functionKey: string;
  defaultProvider: AIProviderId;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  requestTimeoutMs?: number;
  providerOptions?: AccountAIProviderOptions;
  providerApiKeys?: Partial<Record<AIProviderId, string>>;
  enableFallback?: boolean;
  fallbackProvider?: AIProviderId;
  fallbackModel?: string;
}

function resolveProviderModel(
  providerId: AIProviderId,
  options: EdgeFunctionAIProviderFactoryOptions,
  isFallback: boolean = false,
): string | undefined {
  if (isFallback && options.fallbackProvider === providerId && options.fallbackModel) {
    return options.fallbackModel;
  }

  if (!isFallback && providerId === options.defaultProvider && options.defaultModel) {
    return options.defaultModel;
  }

  return options.providerOptions?.[providerId]?.allowedModels?.[0];
}

export class EdgeFunctionAIProviderFactory implements AIProviderFactoryPort {
  private readonly providers: Record<AIProviderId, AIProviderPort>;
  private readonly fallbackProviders: Record<AIProviderId, AIProviderPort>;
  private readonly defaultProviderId: AIProviderId;

  constructor(private readonly options: EdgeFunctionAIProviderFactoryOptions) {
    this.defaultProviderId = options.defaultProvider;

    // Initialize primary providers
    this.providers = this.createProviders(false);

    // Initialize fallback providers (they might have different model overrides)
    this.fallbackProviders = options.enableFallback ? this.createProviders(true) : this.providers;
  }

  private createProviders(isFallback: boolean): Record<AIProviderId, AIProviderPort> {
    const { options } = this;
    return {
      GEMINI: new EdgeFunctionAIProviderAdapter({
        accountId: options.accountId,
        providerId: "GEMINI",
        apiKey: options.providerApiKeys?.GEMINI,
        functionUrl: options.functionUrl,
        functionKey: options.functionKey,
        defaultModel: resolveProviderModel("GEMINI", options, isFallback),
        defaultTemperature: options.defaultTemperature,
        defaultMaxTokens: options.defaultMaxTokens,
        timeoutMs: options.requestTimeoutMs,
      }),
      OPENAI: new EdgeFunctionAIProviderAdapter({
        accountId: options.accountId,
        providerId: "OPENAI",
        apiKey: options.providerApiKeys?.OPENAI,
        functionUrl: options.functionUrl,
        functionKey: options.functionKey,
        defaultModel: resolveProviderModel("OPENAI", options, isFallback),
        defaultTemperature: options.defaultTemperature,
        defaultMaxTokens: options.defaultMaxTokens,
        timeoutMs: options.requestTimeoutMs,
      }),
      ANTHROPIC: new EdgeFunctionAIProviderAdapter({
        accountId: options.accountId,
        providerId: "ANTHROPIC",
        apiKey: options.providerApiKeys?.ANTHROPIC,
        functionUrl: options.functionUrl,
        functionKey: options.functionKey,
        defaultModel: resolveProviderModel("ANTHROPIC", options, isFallback),
        defaultTemperature: options.defaultTemperature,
        defaultMaxTokens: options.defaultMaxTokens,
        timeoutMs: options.requestTimeoutMs,
      }),
    };
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

    // Wrap in fallback decorator if enabled and we are using the default provider
    if (
      this.options.enableFallback &&
      this.options.fallbackProvider &&
      resolvedId === this.defaultProviderId
    ) {
      const fallbackProvider = this.fallbackProviders[this.options.fallbackProvider];
      if (fallbackProvider && fallbackProvider !== provider) {
        return ok(
          new FallbackAIProviderDecorator(provider, fallbackProvider, {
            enableFallback: true,
            onFallback: (err, id) => {
              console.warn(
                `[AI] Primary provider ${resolvedId} failed. Falling back to ${id}. Error:`,
                err,
              );
            },
          }),
        );
      }
    }

    return ok(provider);
  }
}
