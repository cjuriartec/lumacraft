import { describe, expect, it } from "vitest";

import { buildGroundedPrompt } from "@/modules/ai/application/services/prompt-builder";

describe("buildGroundedPrompt", () => {
  it("includes only referenced variable context and metadata", () => {
    const result = buildGroundedPrompt({
      promptTemplate: "Resume a {{cliente.nombre}} con estado {{cliente.estado}}",
      context: {
        cliente: {
          nombre: "Ana",
          estado: "ACTIVO",
          edad: 29,
        },
        total: 100,
      },
      fieldMetadataByPath: {
        "cliente.nombre": {
          path: "cliente.nombre",
          displayName: "Nombre",
          description: "Nombre completo del cliente",
          fieldType: "TEXT",
          collectionId: "col-clientes",
        },
        "cliente.estado": {
          path: "cliente.estado",
          displayName: "Estado",
          description: "Estado comercial",
          fieldType: "ENUM",
          enumOptions: ["ACTIVO", "INACTIVO"],
          collectionId: "col-clientes",
        },
      },
    });

    expect(result.usedPaths).toEqual(["cliente.nombre", "cliente.estado"]);
    expect(result.contextSnapshot).toContain('"nombre": "Ana"');
    expect(result.contextSnapshot).toContain('"estado": "ACTIVO"');
    expect(result.contextSnapshot).not.toContain('"edad"');
    expect(result.metadataSnapshot).toContain("Nombre");
    expect(result.metadataSnapshot).toContain("ENUM");
    expect(result.prompt).toContain("Resume a Ana con estado ACTIVO");
  });

  it("supports locals in interpolation and context projection", () => {
    const result = buildGroundedPrompt({
      promptTemplate: "Item actual: {{item.nombre}}",
      context: {
        cliente: {
          nombre: "Ana",
        },
      },
      locals: {
        item: {
          nombre: "Laptop",
        },
      },
    });

    expect(result.contextSnapshot).toContain('"item"');
    expect(result.contextSnapshot).toContain("Laptop");
    expect(result.prompt).toContain("Item actual: Laptop");
  });

  it("does not include full context when prompt has no variable tokens", () => {
    const result = buildGroundedPrompt({
      promptTemplate: "Escribe un resumen ejecutivo.",
      context: {
        cliente: { nombre: "Ana" },
        total: 100,
      },
    });

    expect(result.usedPaths).toEqual([]);
    expect(result.contextSnapshot).toBe("{}");
    expect(result.metadataSnapshot).toBe("[]");
  });
});
