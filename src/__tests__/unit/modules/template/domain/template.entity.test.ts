import { describe, expect, it } from "vitest";

import { Template } from "@/modules/template/domain/entities/template.entity";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";

describe("Template Entity", () => {
  it("creates a valid template", () => {
    const result = Template.create({
      id: "template-1",
      accountId: "workspace-1",
      name: "Plantilla Factura",
      description: "Plantilla base",
      collectionId: "collection-1",
      blocks: [
        {
          type: "p",
          children: [{ text: "Hola {{cliente.nombre}}" }],
        },
      ],
      createdBy: "user-1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("template-1");
      expect(result.value.accountId).toBe("workspace-1");
      expect(result.value.name).toBe("Plantilla Factura");
      expect(result.value.version).toBe(1);
    }
  });

  it("rejects empty names", () => {
    const result = Template.create({
      id: "template-1",
      accountId: "workspace-1",
      name: " ",
      blocks: [],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_INPUT");
    }
  });

  it("rejects blocks that are not JSON serializable", () => {
    const invalidBlocks = [{ type: "p", children: [{ text: "X" }], onClick: () => null }];
    const result = Template.create({
      id: "template-1",
      accountId: "workspace-1",
      name: "Plantilla",
      blocks: invalidBlocks as unknown as TemplateBlocks,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_BLOCKS");
    }
  });

  it("respects explicit version and serializes to JSON", () => {
    const createdAt = new Date("2024-01-01T10:00:00.000Z");
    const updatedAt = new Date("2024-01-01T11:00:00.000Z");
    const result = Template.create({
      id: "template-1",
      accountId: "workspace-1",
      name: "Plantilla",
      blocks: [],
      version: 7,
      createdAt,
      updatedAt,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const json = result.value.toJSON();
      expect(json.version).toBe(7);
      expect(json.createdAt).toEqual(createdAt);
      expect(json.updatedAt).toEqual(updatedAt);
    }
  });
});
