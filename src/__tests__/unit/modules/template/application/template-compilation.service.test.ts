import { describe, expect, it, vi } from "vitest";

import { AIProviderPort } from "@/modules/ai/domain/ports/ai-provider.port";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
} from "@/modules/ai/domain/types/ai-provider.types";
import {
  PersistedTemplatePreviewCacheEntry,
  TemplatePreviewCachePort,
} from "@/modules/template/application/ports/template-preview-cache.port";
import { TemplateCompilationService } from "@/modules/template/application/services/template-compilation.service";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { TemplateRuntimeContext } from "@/modules/template/domain/types/template-runtime-context";
import { DomainError, ok, Result } from "@/shared/domain/result";

class SlowStructuredAIProvider implements AIProviderPort {
  public readonly id = "GEMINI" as const;

  constructor(private readonly onStream: () => void) {}

  public async generate(
    _request: AIGenerationRequest,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    return ok({
      provider: this.id,
      model: "gemini-test",
      text: '{"blocks":[{"type":"paragraph","text":"AI cached"}]}',
    });
  }

  public async *stream(
    _request: AIGenerationRequest,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    this.onStream();
    await new Promise((resolve) => setTimeout(resolve, 20));
    yield ok({
      provider: this.id,
      model: "gemini-test",
      index: 0,
      text: '{"blocks":[{"type":"paragraph","text":"AI cached"}]}',
    });
  }

  public async testConnection(): Promise<Result<void, DomainError>> {
    return ok(undefined);
  }
}

class SlowStructuredAIProviderFactory implements AIProviderFactoryPort {
  constructor(private readonly provider: AIProviderPort) {}

  public getDefaultProviderId() {
    return "GEMINI" as const;
  }

  public create() {
    return ok(this.provider);
  }
}

class InMemoryPreviewCacheRepository implements TemplatePreviewCachePort {
  public readonly items = new Map<string, PersistedTemplatePreviewCacheEntry>();
  public readonly findByKey = vi.fn(async (cacheKey: string) =>
    ok(this.items.get(cacheKey) ?? null),
  );
  public readonly save = vi.fn(
    async (params: {
      cacheKey: string;
      accountId: string;
      templateId: string;
      templateVersion: number;
      recordId: string;
      blocks: TemplateBlocks;
      warnings: string[];
    }) => {
      this.items.set(params.cacheKey, {
        cacheKey: params.cacheKey,
        blocks: params.blocks,
        warnings: params.warnings,
      });
      return ok(undefined);
    },
  );
}

function buildContext(): TemplateRuntimeContext {
  return {
    recordId: "record-1",
    collectionId: "collection-1",
    collectionName: "Clientes",
    root: {
      cliente: {
        nombre: "Ana",
      },
    },
  };
}

function buildContextWithUnrelatedFields(age: number): TemplateRuntimeContext {
  return {
    recordId: "record-1",
    collectionId: "collection-1",
    collectionName: "Clientes",
    root: {
      cliente: {
        nombre: "Ana",
        edad: age,
      },
      auditoria: {
        actualizadoPor: `user-${age}`,
      },
    },
  };
}

describe("TemplateCompilationService", () => {
  it("reuses full preview cache for identical inputs", async () => {
    const previewCache = new InMemoryPreviewCacheRepository();
    const streamSpy = vi.fn();
    const service = new TemplateCompilationService();
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Hola {{cliente.nombre}}" }] }];

    const first = await service.compile({
      requestId: "req-1",
      templateId: "template-1",
      templateVersion: 2,
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks,
      context: buildContext(),
      aiProviderFactory: new SlowStructuredAIProviderFactory(
        new SlowStructuredAIProvider(streamSpy),
      ),
      previewCache,
      aiSettingsHash: "settings-hash",
    });

    expect(first.ok).toBe(true);
    expect(previewCache.save).toHaveBeenCalledTimes(1);

    const second = await service.compile({
      requestId: "req-2",
      templateId: "template-1",
      templateVersion: 2,
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks,
      context: buildContext(),
      aiProviderFactory: new SlowStructuredAIProviderFactory(
        new SlowStructuredAIProvider(streamSpy),
      ),
      previewCache,
      aiSettingsHash: "settings-hash",
    });

    expect(second.ok).toBe(true);
    expect(previewCache.findByKey).toHaveBeenCalledTimes(2);
    expect(streamSpy).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent compilations with the same cache key", async () => {
    const previewCache = new InMemoryPreviewCacheRepository();
    const streamSpy = vi.fn();
    const service = new TemplateCompilationService();
    const blocks: TemplateBlocks = [
      {
        type: "template_ai",
        promptTemplate: "Resume {{cliente.nombre}}",
        children: [{ text: "" }],
      },
    ];

    const providerFactory = new SlowStructuredAIProviderFactory(
      new SlowStructuredAIProvider(streamSpy),
    );
    const [first, second] = await Promise.all([
      service.compile({
        requestId: "req-a",
        templateId: "template-1",
        templateVersion: 2,
        accountId: "workspace-1",
        collectionId: "collection-1",
        recordId: "record-1",
        blocks,
        context: buildContext(),
        aiProviderFactory: providerFactory,
        previewCache,
        aiSettingsHash: "settings-hash",
      }),
      service.compile({
        requestId: "req-b",
        templateId: "template-1",
        templateVersion: 2,
        accountId: "workspace-1",
        collectionId: "collection-1",
        recordId: "record-1",
        blocks,
        context: buildContext(),
        aiProviderFactory: providerFactory,
        previewCache,
        aiSettingsHash: "settings-hash",
      }),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(streamSpy).toHaveBeenCalledTimes(1);
  });

  it("reuses preview cache when unrelated context fields change", async () => {
    const previewCache = new InMemoryPreviewCacheRepository();
    const service = new TemplateCompilationService();
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Hola {{cliente.nombre}}" }] }];

    const first = await service.compile({
      requestId: "req-projected-1",
      templateId: "template-1",
      templateVersion: 2,
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks,
      context: buildContextWithUnrelatedFields(30),
      aiProviderFactory: new SlowStructuredAIProviderFactory(new SlowStructuredAIProvider(vi.fn())),
      previewCache,
      aiSettingsHash: "settings-hash",
    });

    const second = await service.compile({
      requestId: "req-projected-2",
      templateId: "template-1",
      templateVersion: 2,
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks,
      context: buildContextWithUnrelatedFields(31),
      aiProviderFactory: new SlowStructuredAIProviderFactory(new SlowStructuredAIProvider(vi.fn())),
      previewCache,
      aiSettingsHash: "settings-hash",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(previewCache.save).toHaveBeenCalledTimes(1);
  });

  it("busts preview cache when ai settings hash changes", async () => {
    const previewCache = new InMemoryPreviewCacheRepository();
    const streamSpy = vi.fn();
    const service = new TemplateCompilationService();
    const blocks: TemplateBlocks = [
      {
        type: "template_ai",
        promptTemplate: "Resume {{cliente.nombre}}",
        children: [{ text: "" }],
      },
    ];

    const first = await service.compile({
      requestId: "req-cache-hash-1",
      templateId: "template-1",
      templateVersion: 2,
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks,
      context: buildContext(),
      aiProviderFactory: new SlowStructuredAIProviderFactory(
        new SlowStructuredAIProvider(streamSpy),
      ),
      previewCache,
      aiSettingsHash: "settings-hash-1",
    });

    const second = await service.compile({
      requestId: "req-cache-hash-2",
      templateId: "template-1",
      templateVersion: 2,
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks,
      context: buildContext(),
      aiProviderFactory: new SlowStructuredAIProviderFactory(
        new SlowStructuredAIProvider(streamSpy),
      ),
      previewCache,
      aiSettingsHash: "settings-hash-2",
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(streamSpy).toHaveBeenCalledTimes(2);
    expect(previewCache.save).toHaveBeenCalledTimes(2);
  });
});
