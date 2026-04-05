import { describe, expect, it, vi } from "vitest";

import { makeTemplate, resetFactories } from "@/__tests__/factories/domain-factories";
import { InMemoryTemplateRepository } from "@/__tests__/helpers/fakes";
import { AIProviderPort } from "@/modules/ai/domain/ports/ai-provider.port";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
} from "@/modules/ai/domain/types/ai-provider.types";
import { TemplateRuntimeContextResolverPort } from "@/modules/template/application/ports/template-runtime-context-resolver.port";
import { TemplatePreviewEvent } from "@/modules/template/application/services/template-preview.types";
import { GenerateTemplatePreviewUseCase } from "@/modules/template/application/use-cases/generate-template-preview.use-case";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { TemplateRuntimeContext } from "@/modules/template/domain/types/template-runtime-context";
import { DomainError, ok, Result } from "@/shared/domain/result";

class StaticAIProvider implements AIProviderPort {
  public readonly id = "GEMINI" as const;

  public async generate(
    _request: AIGenerationRequest,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    return ok({ provider: this.id, model: "gemini-test", text: "AI text" });
  }

  public async *stream(
    _request: AIGenerationRequest,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    yield ok({ provider: this.id, model: "gemini-test", index: 0, text: "AI text" });
  }
}

class StaticAIProviderFactory implements AIProviderFactoryPort {
  private readonly provider = new StaticAIProvider();

  public getDefaultProviderId() {
    return "GEMINI" as const;
  }

  public create() {
    return ok(this.provider);
  }
}

class StaticContextResolver implements TemplateRuntimeContextResolverPort {
  constructor(private readonly context: TemplateRuntimeContext) {}

  public async resolve() {
    return ok(this.context);
  }
}

describe("GenerateTemplatePreviewUseCase", () => {
  it("compiles preview and emits done event", async () => {
    resetFactories();

    const template = makeTemplate({
      id: "template-1",
      accountId: "workspace-1",
      collectionId: "collection-1",
      blocks: [{ type: "p", children: [{ text: "Persistido" }] }],
    });

    const repository = new InMemoryTemplateRepository([template]);
    const contextResolver = new StaticContextResolver({
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {
        name: "Ana",
        email: "ana@example.com",
      },
    });

    const onEvent = vi.fn<(event: TemplatePreviewEvent) => void>();
    const blocks: TemplateBlocks = [
      {
        id: "intro",
        type: "p",
        children: [
          { text: "Hola " },
          { id: "name", type: "variable", fieldPath: "name", children: [{ text: "" }] },
          { text: " - " },
          { id: "email", type: "variable", fieldPath: "email", children: [{ text: "" }] },
        ],
      },
    ];

    const useCase = new GenerateTemplatePreviewUseCase(
      repository,
      contextResolver,
      new StaticAIProviderFactory(),
    );

    const result = await useCase.execute({
      requestId: "req-1",
      templateId: "template-1",
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks,
      onEvent,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      const compiled = JSON.stringify(result.value.blocks);
      expect(result.value.requestId).toBe("req-1");
      expect(compiled).toContain('"text":"Hola "');
      expect(compiled).toContain('"text":"Ana"');
      expect(compiled).toContain('"text":" - "');
      expect(compiled).toContain('"text":"ana@example.com"');
      expect(compiled).not.toContain("Persistido");
    }

    const eventTypes = onEvent.mock.calls.map(([event]) => event.type);
    expect(eventTypes[0]).toBe("meta");
    expect(eventTypes).toContain("pending");
    expect(eventTypes).toContain("resolved");
    expect(eventTypes[eventTypes.length - 1]).toBe("done");
  });

  it("returns TEMPLATE_ACCOUNT_MISMATCH when account differs", async () => {
    resetFactories();

    const template = makeTemplate({
      id: "template-1",
      accountId: "workspace-1",
      collectionId: "collection-1",
      blocks: [{ type: "p", children: [{ text: "Hola" }] }],
    });

    const repository = new InMemoryTemplateRepository([template]);
    const contextResolver = new StaticContextResolver({
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {},
    });

    const useCase = new GenerateTemplatePreviewUseCase(
      repository,
      contextResolver,
      new StaticAIProviderFactory(),
    );

    const result = await useCase.execute({
      requestId: "req-2",
      templateId: "template-1",
      accountId: "workspace-2",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks: [{ type: "p", children: [{ text: "Hola" }] }],
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("TEMPLATE_ACCOUNT_MISMATCH");
    }
  });

  it("emits structured block events for logic, list and ai blocks", async () => {
    resetFactories();

    const template = makeTemplate({
      id: "template-nested",
      accountId: "workspace-1",
      collectionId: "collection-1",
      blocks: [
        {
          id: "intro",
          type: "p",
          children: [
            { text: "Hola " },
            { id: "v1", type: "variable", fieldPath: "nombre", children: [{ text: "" }] },
            { text: " " },
            { id: "v2", type: "variable", fieldPath: "apellidos", children: [{ text: "" }] },
          ],
        },
        {
          id: "group",
          type: "column_group",
          children: [
            {
              id: "col",
              type: "column",
              children: [
                { id: "t1", type: "p", children: [{ text: "Condicional" }] },
                {
                  id: "c1",
                  type: "template_conditional",
                  fieldPath: "enumeable",
                  operator: "equals",
                  value: "uno",
                  thenTemplate: "Es uno",
                  elseTemplate: "No es uno",
                  children: [{ text: "" }],
                },
                { id: "t2", type: "p", children: [{ text: "Switch" }] },
                {
                  id: "s1",
                  type: "template_switch",
                  fieldPath: "enumeable",
                  cases: [{ equals: "uno", template: "1" }],
                  defaultTemplate: "0",
                  children: [{ text: "" }],
                },
                { id: "t3", type: "p", children: [{ text: "AI BLOCK" }] },
                {
                  id: "a1",
                  type: "template_ai",
                  promptTemplate: "Resume {{necesidad}}",
                  provider: "GEMINI",
                  children: [{ text: "" }],
                },
                { id: "t4", type: "p", children: [{ text: "LIST" }] },
                {
                  id: "l1",
                  type: "template_list",
                  sourcePath: "requerimiento",
                  itemAlias: "item",
                  itemTemplate: "- {{item.nombre}}\n",
                  emptyText: "No hay requerimientos",
                  children: [{ text: "" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const repository = new InMemoryTemplateRepository([template]);
    const contextResolver = new StaticContextResolver({
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {
        nombre: "Juanito",
        apellidos: "Alcachofa",
        enumeable: "uno",
        necesidad: "",
        requerimiento: [{ nombre: "Req A" }, { nombre: "Req B" }],
      },
    });
    const onEvent = vi.fn<(event: TemplatePreviewEvent) => void>();

    const useCase = new GenerateTemplatePreviewUseCase(
      repository,
      contextResolver,
      new StaticAIProviderFactory(),
    );

    const result = await useCase.execute({
      requestId: "req-3",
      templateId: "template-nested",
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      blocks: template.blocks as TemplateBlocks,
      onEvent,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      const compiled = JSON.stringify(result.value.blocks);
      expect(compiled).toContain('"text":"Hola "');
      expect(compiled).toContain('"text":"Juanito"');
      expect(compiled).toContain('"text":"Alcachofa"');
      expect(compiled).toContain("Condicional");
      expect(compiled).toContain("Es uno");
      expect(compiled).toContain("Switch");
      expect(compiled).toContain("1");
      expect(compiled).toContain("AI BLOCK");
      expect(compiled).toContain("AI text");
      expect(compiled).toContain("LIST");
      expect(compiled).toContain("Req A");
      expect(compiled).toContain("Req B");
    }

    const eventTypes = new Set<string>();
    onEvent.mock.calls.forEach(([event]) => {
      eventTypes.add(event.type);
    });

    expect(eventTypes.has("branch_selected")).toBe(true);
    expect(eventTypes.has("items_resolved")).toBe(true);
    expect(eventTypes.has("ai_chunk")).toBe(true);
  });
});
