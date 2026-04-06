import { describe, expect, it, vi } from "vitest";

import { AIProviderPort } from "@/modules/ai/domain/ports/ai-provider.port";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
} from "@/modules/ai/domain/types/ai-provider.types";
import {
  evaluateTemplateLogic,
  markdownToHtml,
} from "@/modules/template/application/services/template-logic-evaluator";
import { TemplateLogicBlock } from "@/modules/template/domain/types/template-logic-blocks";
import { TemplateRuntimeContext } from "@/modules/template/domain/types/template-runtime-context";
import { DomainError, ok, Result } from "@/shared/domain/result";

class StaticAIProvider implements AIProviderPort {
  public readonly id = "GEMINI" as const;

  public async generate(
    _request: AIGenerationRequest,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    return ok({
      provider: this.id,
      model: "gemini-test",
      text: "IA chunk",
    });
  }

  public async *stream(
    _request: AIGenerationRequest,
  ): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    yield ok({
      provider: this.id,
      model: "gemini-test",
      index: 0,
      text: "IA chunk",
    });
  }

  public async testConnection(): Promise<Result<void, DomainError>> {
    return ok(undefined);
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

describe("template logic evaluator", () => {
  it("evaluates conditional, list, switch and ai blocks", async () => {
    const context: TemplateRuntimeContext = {
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {
        customer: {
          name: "Ana",
        },
        status: "approved",
        items: [{ name: "Laptop" }, { name: "Mouse" }],
      },
    };

    const blocks: TemplateLogicBlock[] = [
      { type: "text", text: "Hola {{customer.name}}\n" },
      {
        type: "conditional",
        condition: {
          path: "status",
          operator: "equals",
          value: "approved",
        },
        thenBlocks: [{ type: "text", text: "Estado aprobado\n" }],
      },
      {
        type: "list",
        sourcePath: "items",
        itemAlias: "item",
        blocks: [{ type: "text", text: "- {{item.name}}\n" }],
      },
      {
        type: "switch",
        path: "status",
        cases: [
          {
            equals: "approved",
            blocks: [{ type: "text", text: "Switch approved\n" }],
          },
        ],
      },
      {
        type: "ai",
        prompt: "Resume {{customer.name}}",
      },
    ];

    const onEvent = vi.fn();

    const result = await evaluateTemplateLogic({
      blocks,
      context,
      aiProviderFactory: new StaticAIProviderFactory(),
      onEvent,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.markdown).toContain("Hola Ana");
      expect(result.value.markdown).toContain("Estado aprobado");
      expect(result.value.markdown).toContain("- Laptop");
      expect(result.value.markdown).toContain("Switch approved");
      expect(result.value.markdown).toContain("IA chunk");
    }

    expect(onEvent).toHaveBeenCalled();
  });

  it("renders markdown into html", () => {
    const html = markdownToHtml("# Titulo\n- Item\n\nParrafo");

    expect(html).toContain("<h1>Titulo</h1>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<p>Parrafo</p>");
  });
});
