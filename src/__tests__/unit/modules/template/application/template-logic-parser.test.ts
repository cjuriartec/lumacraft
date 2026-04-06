import { describe, expect, it } from "vitest";

import { parseTemplateBlocksToLogic } from "@/modules/template/application/services/template-logic-parser";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";

describe("template logic parser", () => {
  it("parses custom template nodes from persisted plate blocks", () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [{ text: "Hola " }, { text: "mundo" }],
      },
      {
        type: "variable",
        fieldPath: "customer.name",
        children: [{ text: "" }],
      },
      {
        type: "template_list",
        sourcePath: "items",
        itemAlias: "item",
        itemTemplate: "- {{item.name}}\\n",
        children: [{ text: "" }],
      },
      {
        type: "template_ai",
        promptTemplate: "Resume {{customer.name}}",
        provider: "GEMINI",
        model: "gemini-2.0-flash",
        temperature: 0.2,
        maxTokens: 300,
        children: [{ text: "" }],
      },
    ];

    const result = parseTemplateBlocksToLogic(blocks);

    expect(result.warnings).toEqual([]);
    expect(result.blocks).toHaveLength(5);
    expect(result.blocks[0]).toEqual({ type: "text", text: "Hola mundo\n" });
    expect(result.blocks[1]).toEqual({
      type: "variable",
      path: "customer.name",
      valueType: "text",
    });
    expect(result.blocks[2]).toMatchObject({
      type: "list",
      sourcePath: "items",
      itemAlias: "item",
    });
    expect(result.blocks[3]).toEqual({ type: "text", text: "\n" });
    expect(result.blocks[4]).toEqual({
      type: "ai",
      prompt: "Resume {{customer.name}}",
    });
  });

  it("skips unknown template nodes and appends warnings", () => {
    const blocks: TemplateBlocks = [
      {
        type: "template_unknown",
        children: [{ text: "" }],
      },
    ];

    const result = parseTemplateBlocksToLogic(blocks);

    expect(result.blocks).toEqual([]);
    expect(result.warnings).toContain("Skipped unknown template node type: template_unknown");
  });

  it("parses nested logic nodes inside structural containers and preserves readable spacing", () => {
    const blocks: TemplateBlocks = [
      {
        type: "column_group",
        children: [
          {
            type: "column",
            children: [
              {
                type: "p",
                children: [{ text: "Condicional" }],
              },
              {
                type: "template_conditional",
                fieldPath: "estado",
                operator: "equals",
                value: "uno",
                thenTemplate: "Es uno",
                elseTemplate: "No es uno",
                children: [{ text: "" }],
              },
              {
                type: "p",
                children: [{ text: "Switch" }],
              },
              {
                type: "template_switch",
                fieldPath: "estado",
                cases: [{ equals: "uno", template: "1" }],
                children: [{ text: "" }],
              },
              {
                type: "p",
                children: [
                  { text: "Ir a " },
                  {
                    type: "a",
                    url: "https://example.com",
                    children: [{ text: "sitio" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const result = parseTemplateBlocksToLogic(blocks);

    expect(result.warnings).toEqual([]);
    expect(result.blocks.some((block) => block.type === "conditional")).toBe(true);
    expect(result.blocks.some((block) => block.type === "switch")).toBe(true);

    const renderedText = result.blocks
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("");

    expect(renderedText).toContain("Condicional\n");
    expect(renderedText).toContain("Switch\n");
    expect(renderedText).toContain("[sitio](https://example.com)\n");
  });
});
