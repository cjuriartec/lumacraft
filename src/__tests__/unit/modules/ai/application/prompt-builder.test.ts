import { describe, expect, it } from "vitest";

import { buildGroundedPrompt } from "@/modules/ai/application/services/prompt-builder";

describe("buildGroundedPrompt", () => {
  it("uses the internal document builder system prompt by default", () => {
    const result = buildGroundedPrompt({
      promptTemplate: "Redacta una salida util.",
      context: {
        cliente: { nombre: "Ana" },
      },
    });

    expect(result.prompt).toContain("# System");
    expect(result.prompt).toContain("constructor de bloques de documento");
  });

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
    expect(result.contextSnapshot).not.toContain('"total"');
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

  it("uses a minimal summary when prompt has no variable tokens", () => {
    const result = buildGroundedPrompt({
      promptTemplate: "Escribe un resumen ejecutivo.",
      context: {
        cliente: { nombre: "Ana" },
        total: 100,
      },
    });

    expect(result.usedPaths).toEqual([]);
    expect(result.contextSnapshot).toContain('"total"');
    expect(result.contextSnapshot).not.toContain('"cliente"');
    expect(result.mode).toBe("minimal_summary");
  });

  it("includes collection context in the prompt when provided", () => {
    const result = buildGroundedPrompt({
      promptTemplate: "Resume {{root}}",
      context: { nombre: "Test" },
      collectionContext: {
        id: "col-123",
        name: "Clientes",
        description: "Gestión de clientes y contactos",
      },
    });

    expect(result.prompt).toContain("# Collection Context");
    expect(result.prompt).toContain("Name: Clientes");
    expect(result.prompt).toContain("Description: Gestión de clientes y contactos");
    expect(result.prompt).toContain("ID: col-123");
  });

  it("omits collection context section when not provided", () => {
    const result = buildGroundedPrompt({
      promptTemplate: "Resume {{root}}",
      context: { nombre: "Test" },
    });

    expect(result.prompt).not.toContain("# Collection Context");
  });
});
