import { afterEach, describe, expect, it } from "vitest";

import { AIProviderPort } from "@/modules/ai/domain/ports/ai-provider.port";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import {
  AIGenerationChunk,
  AIGenerationRequest,
  AIGenerationResponse,
} from "@/modules/ai/domain/types/ai-provider.types";
import { TemplateAssetUrlResolverPort } from "@/modules/template/application/ports/template-asset-url-resolver.port";
import { compileTemplatePreviewBlocks } from "@/modules/template/application/services/template-preview-blocks-compiler";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { TemplateRuntimeContext } from "@/modules/template/domain/types/template-runtime-context";
import { DomainError, ok, Result } from "@/shared/domain/result";

class StructuredAIProvider implements AIProviderPort {
  readonly id = "GEMINI" as const;

  async generate(
    _request: AIGenerationRequest,
  ): Promise<Result<AIGenerationResponse, DomainError>> {
    return ok({
      provider: "GEMINI",
      model: "gemini-test",
      text: JSON.stringify({
        blocks: [
          { type: "paragraph", text: "Informe técnico generado" },
          { type: "bullet_list", items: ["Revisión inicial", "Plan de ejecución"] },
        ],
      }),
    });
  }

  async *stream(): AsyncGenerator<Result<AIGenerationChunk, DomainError>, void, void> {
    yield ok({
      provider: "GEMINI",
      model: "gemini-test",
      index: 0,
      text: '{"blocks":[{"type":"paragraph","text":"Informe técnico generado"},',
    });
    yield ok({
      provider: "GEMINI",
      model: "gemini-test",
      index: 1,
      text: '{"type":"bullet_list","items":["Revisión inicial","Plan de ejecución"]}]}',
    });
  }
  async testConnection(): Promise<Result<void, DomainError>> {
    return ok(undefined);
  }
}

class StructuredAIProviderFactory implements AIProviderFactoryPort {
  private readonly provider = new StructuredAIProvider();

  getDefaultProviderId() {
    return "GEMINI" as const;
  }

  create() {
    return ok(this.provider);
  }
}

class StaticAssetUrlResolver implements TemplateAssetUrlResolverPort {
  public async resolveImageUrl(params: {
    bucket: string;
    path: string;
  }): Promise<Result<string, DomainError>> {
    return ok(`https://signed.example/${params.bucket}/${params.path}`);
  }
}

function flattenTypes(nodes: unknown[]): string[] {
  const result: string[] = [];

  for (const node of nodes) {
    if (!node || typeof node !== "object" || !("type" in node)) continue;
    const typed = node as { type: string; children?: unknown[] };
    result.push(typed.type);
    if (Array.isArray(typed.children)) {
      result.push(...flattenTypes(typed.children));
    }
  }

  return result;
}

describe("compileTemplatePreviewBlocks", () => {
  const previousSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previousSupabaseUrl;
  });

  it("compiles variables, logic and ai blocks into plate-compatible blocks", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://demo-project.supabase.co";

    const templateBlocks: TemplateBlocks = [
      {
        type: "p",
        children: [
          { text: "Hola " },
          { type: "variable", fieldPath: "nombre", children: [{ text: "" }] },
        ],
      },
      {
        type: "p",
        children: [
          { text: "" },
          {
            type: "variable",
            fieldPath: "fotex",
            fieldType: "IMAGE",
            imageWidthPercent: 55,
            imageHeightPx: 240,
            children: [{ text: "" }],
          },
        ],
      },
      {
        type: "template_conditional",
        fieldPath: "estado",
        operator: "equals",
        value: "ok",
        thenTemplate: "Condición OK",
        elseTemplate: "Condición NO",
        children: [{ text: "" }],
      },
      {
        type: "template_switch",
        fieldPath: "estado",
        cases: [{ equals: "ok", template: "Switch OK" }],
        defaultTemplate: "Switch Default",
        children: [{ text: "" }],
      },
      {
        type: "template_list",
        sourcePath: "items",
        itemAlias: "item",
        itemTemplate: "- {{item.nombre}}",
        emptyText: "Sin items",
        children: [{ text: "" }],
      },
      {
        type: "template_ai",
        promptTemplate: "Genera un informe basado en {{nombre}}",
        provider: "GEMINI",
        model: "gemini-2.0-flash",
        temperature: 0.3,
        maxTokens: 512,
        children: [{ text: "" }],
      },
    ];

    const context: TemplateRuntimeContext = {
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {
        nombre: "Coti1",
        estado: "ok",
        items: [{ nombre: "Primer requerimiento" }, { nombre: "Segundo requerimiento" }],
        fotex: {
          name: "images.jpeg",
          path: "bucket-path/file.jpeg",
          bucket: "record_files",
          mimeType: "image/jpeg",
          size: 100,
        },
      },
    };

    const result = await compileTemplatePreviewBlocks({
      requestId: "req-1",
      blocks: templateBlocks,
      context,
      aiProviderFactory: new StructuredAIProviderFactory(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const compiled = result.value.blocks;
    const compiledText = JSON.stringify(compiled);
    const types = flattenTypes(compiled as unknown[]);

    expect(compiledText).toContain('"text":"Hola "');
    expect(compiledText).toContain('"text":"Coti1"');
    expect(compiledText).toContain("Condición OK");
    expect(compiledText).toContain("Switch OK");
    expect(compiledText).toContain("Primer requerimiento");
    expect(compiledText).toContain("Informe técnico generado");
    expect(compiledText).toContain("Revisión inicial");
    expect(compiledText).toContain(
      "https://demo-project.supabase.co/storage/v1/object/public/record_files/bucket-path/file.jpeg",
    );
    expect(compiledText).toContain('"width":"55%"');
    expect(compiledText).toContain('"height":240');
    expect(types).not.toContain("template_ai");
    expect(types).not.toContain("template_conditional");
    expect(types).not.toContain("template_switch");
    expect(types).not.toContain("template_list");
  });

  it("applies list styles (bullet/number) to list blocks", async () => {
    const templateBlocks: TemplateBlocks = [
      {
        type: "template_list",
        sourcePath: "items",
        itemAlias: "item",
        itemTemplate: "{{item.nombre}}",
        listStyle: "bullet",
        children: [{ text: "" }],
      },
    ];

    const context: TemplateRuntimeContext = {
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {
        items: [{ nombre: "A" }, { nombre: "B" }],
      },
    };

    const result = await compileTemplatePreviewBlocks({
      requestId: "req-list-style",
      blocks: templateBlocks,
      context,
      aiProviderFactory: new StructuredAIProviderFactory(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compiled = result.value.blocks as any[];
    expect(compiled).toHaveLength(2);
    expect(compiled[0].listStyleType).toBe("disc");
    expect(compiled[0].indent).toBe(1);
    expect(compiled[1].listStyleType).toBe("disc");
    expect(compiled[1].indent).toBe(1);

    // Test numbered list
    const numberedResult = await compileTemplatePreviewBlocks({
      requestId: "req-list-num",
      blocks: [
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(templateBlocks[0] as any),
          listStyle: "number",
        },
      ],
      context,
      aiProviderFactory: new StructuredAIProviderFactory(),
    });

    expect(numberedResult.ok).toBe(true);
    if (!numberedResult.ok) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const numberedBlocks = numberedResult.value.blocks as any[];
    expect(numberedBlocks[0].listStyleType).toBe("decimal");
    expect(numberedBlocks[0].indent).toBe(1);
  });

  it("uses signed URLs for image variables when resolver is available", async () => {
    const templateBlocks: TemplateBlocks = [
      {
        type: "p",
        children: [
          { text: "" },
          {
            type: "variable",
            fieldPath: "fotex",
            fieldType: "IMAGE",
            imageWidthPercent: 30,
            imageHeightPx: 160,
            children: [{ text: "" }],
          },
          { text: "" },
        ],
      },
    ];

    const context: TemplateRuntimeContext = {
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {
        fotex: {
          name: "images.jpeg",
          path: "bucket-path/file.jpeg",
          bucket: "record_files",
          mimeType: "image/jpeg",
          size: 100,
        },
      },
    };

    const result = await compileTemplatePreviewBlocks({
      requestId: "req-2",
      blocks: templateBlocks,
      context,
      aiProviderFactory: new StructuredAIProviderFactory(),
      assetUrlResolver: new StaticAssetUrlResolver(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(JSON.stringify(result.value.blocks)).toContain(
      '"url":"https://signed.example/record_files/bucket-path/file.jpeg"',
    );
    expect(JSON.stringify(result.value.blocks)).toContain('"width":"30%"');
    expect(JSON.stringify(result.value.blocks)).toContain('"height":160');
  });

  it("preserves font size and font family when resolving inline variables", async () => {
    const templateBlocks: TemplateBlocks = [
      {
        type: "p",
        fontFamily: "times",
        children: [
          { text: "Cliente: ", fontSize: "20px", fontFamily: "times" },
          {
            type: "variable",
            fieldPath: "nombre",
            fontFamily: "times",
            fontSize: "20px",
            color: "#111111",
            underline: true,
            children: [{ text: "" }],
          },
        ],
      },
    ];

    const context: TemplateRuntimeContext = {
      recordId: "record-1",
      collectionId: "collection-1",
      collectionName: "Clientes",
      root: {
        nombre: "Coti1",
      },
    };

    const result = await compileTemplatePreviewBlocks({
      requestId: "req-inline-fonts",
      blocks: templateBlocks,
      context,
      aiProviderFactory: new StructuredAIProviderFactory(),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const compiledText = JSON.stringify(result.value.blocks);
    expect(compiledText).toContain('"text":"Coti1"');
    expect(compiledText).toContain('"fontSize":"20px"');
    expect(compiledText).toContain('"fontFamily":"times"');
    expect(compiledText).toContain('"underline":true');
  });
});
