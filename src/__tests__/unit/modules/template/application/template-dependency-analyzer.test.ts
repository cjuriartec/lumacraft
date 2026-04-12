import { describe, expect, it } from "vitest";

import { analyzeTemplateDependencies } from "@/modules/template/application/services/template-dependency-analyzer";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";

describe("analyzeTemplateDependencies", () => {
  it("collects referenced paths, relation paths and ai dependencies", () => {
    const blocks: TemplateBlocks = [
      {
        id: "intro",
        type: "p",
        children: [
          { text: "Cliente: " },
          { type: "variable", fieldPath: "cliente.nombre", children: [{ text: "" }] },
        ],
      },
      {
        id: "items",
        type: "template_list",
        sourcePath: "cliente.requerimientos",
        itemAlias: "item",
        blocks: [
          {
            id: "item-line",
            type: "p",
            children: [{ text: "{{item.nombre}}" }],
          },
          {
            id: "item-ai",
            type: "template_ai",
            promptTemplate: "Resume {{item.nombre}} con estado {{cliente.estado}}",
            children: [{ text: "" }],
          },
        ],
        children: [{ text: "" }],
      },
    ];

    const result = analyzeTemplateDependencies(blocks);

    expect(result.referencedPaths).toEqual(
      expect.arrayContaining([
        "cliente.nombre",
        "cliente.requerimientos",
        "cliente.requerimientos.nombre",
        "cliente.estado",
      ]),
    );
    expect(result.relationPaths).toEqual(
      expect.arrayContaining(["cliente.requerimientos", "cliente.requerimientos.nombre"]),
    );
    expect(result.aiBlocks).toEqual([
      expect.objectContaining({
        blockId: "item-ai",
        promptPaths: ["cliente.requerimientos.nombre", "cliente.estado"],
        requiresFullContext: false,
      }),
    ]);
    expect(result.depth).toBeGreaterThanOrEqual(2);
  });

  it("marks AI blocks as full-context when prompt references root", () => {
    const blocks: TemplateBlocks = [
      {
        id: "ai-root",
        type: "template_ai",
        promptTemplate: "Resume {{root}}",
        children: [{ text: "" }],
      },
    ];

    const result = analyzeTemplateDependencies(blocks);

    expect(result.aiBlocks).toEqual([
      expect.objectContaining({
        blockId: "ai-root",
        requiresFullContext: true,
      }),
    ]);
  });
});
