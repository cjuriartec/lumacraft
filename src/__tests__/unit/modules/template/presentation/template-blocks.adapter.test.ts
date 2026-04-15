import { describe, expect, it } from "vitest";

import {
  plateValueToTemplateBlocks,
  templateBlocksToPlateValue,
} from "@/modules/template/presentation/lib/template-blocks.adapter";

describe("template-blocks.adapter", () => {
  it("removes persisted table row heights when loading plate value", () => {
    const value = templateBlocksToPlateValue([
      {
        type: "table",
        children: [
          {
            type: "tr",
            size: 120,
            children: [
              {
                type: "td",
                children: [{ type: "p", children: [{ text: "Celda" }] }],
              },
            ],
          },
        ],
      },
    ]);

    const row = (value[0] as { children: Array<{ size?: unknown }> }).children[0];
    expect(row).not.toHaveProperty("size");
  });

  it("does not persist table row heights when serializing plate value", () => {
    const blocks = plateValueToTemplateBlocks([
      {
        type: "table",
        children: [
          {
            type: "tr",
            size: 160,
            children: [
              {
                type: "td",
                children: [{ type: "p", children: [{ text: "Celda" }] }],
              },
            ],
          },
        ],
      },
    ]);

    const row = (blocks[0] as { children: Array<{ size?: unknown }> }).children[0] as {
      size?: unknown;
    };
    expect(row).not.toHaveProperty("size");
  });
});
