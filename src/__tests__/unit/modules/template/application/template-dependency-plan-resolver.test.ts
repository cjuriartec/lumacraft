import { describe, expect, it } from "vitest";

import { resolveTemplateDependencyPlan } from "@/modules/template/application/services/template-dependency-plan-resolver";
import { TemplateDependencyPlan } from "@/modules/template/application/types/template-dependency-plan";
import { ok } from "@/shared/domain/result";

describe("resolveTemplateDependencyPlan", () => {
  it("keeps eager depth at 0 for scalar-only templates and minimal-summary AI blocks", async () => {
    const dependencyPlan: TemplateDependencyPlan = {
      blockMetadata: [],
      referencedPaths: ["nombre", "estado"],
      relationPaths: ["nombre", "estado"],
      aiBlocks: [
        {
          blockId: "ai-1",
          blockIndex: 0,
          promptPaths: [],
          contextMode: "minimal_summary",
        },
      ],
      imagePaths: [],
      depth: 0,
    };

    const result = await resolveTemplateDependencyPlan({
      collectionId: "root",
      dependencyPlan,
      loadFields: async () =>
        ok([
          { name: "nombre", fieldType: "TEXT" },
          { name: "estado", fieldType: "ENUM" },
        ]),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.eagerDepth).toBe(0);
    expect(result.value.relationPaths).toEqual([]);
    expect(result.value.runtimeProjectionPaths).toEqual(["estado", "nombre"]);
    expect(result.value.requiresFieldMetadata).toBe(false);
  });

  it("resolves relation depth from real schema paths", async () => {
    const dependencyPlan: TemplateDependencyPlan = {
      blockMetadata: [],
      referencedPaths: ["cliente", "cliente.nombre", "cliente.empresa.nombre"],
      relationPaths: ["cliente", "cliente.nombre", "cliente.empresa.nombre"],
      aiBlocks: [],
      imagePaths: [],
      depth: 2,
    };

    const fieldsByCollectionId = new Map([
      [
        "root",
        [
          {
            name: "cliente",
            fieldType: "RELATION",
            targetCollectionId: "clientes",
          },
        ],
      ],
      [
        "clientes",
        [
          { name: "nombre", fieldType: "TEXT" },
          {
            name: "empresa",
            fieldType: "RELATION",
            targetCollectionId: "empresas",
          },
        ],
      ],
      ["empresas", [{ name: "nombre", fieldType: "TEXT" }]],
    ]);

    const result = await resolveTemplateDependencyPlan({
      collectionId: "root",
      dependencyPlan,
      loadFields: async (collectionId) => ok(fieldsByCollectionId.get(collectionId) ?? []),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.eagerDepth).toBe(2);
    expect(result.value.relationPaths).toEqual(["cliente", "cliente.empresa"]);
  });

  it("marks explicit-path AI blocks as metadata-dependent", async () => {
    const dependencyPlan: TemplateDependencyPlan = {
      blockMetadata: [],
      referencedPaths: ["cliente.nombre"],
      relationPaths: ["cliente.nombre"],
      aiBlocks: [
        {
          blockId: "ai-1",
          blockIndex: 0,
          promptPaths: ["cliente.nombre"],
          contextMode: "explicit_paths",
        },
      ],
      imagePaths: [],
      depth: 1,
    };

    const result = await resolveTemplateDependencyPlan({
      collectionId: "root",
      dependencyPlan,
      loadFields: async (collectionId) =>
        ok(
          collectionId === "root"
            ? [{ name: "cliente", fieldType: "RELATION", targetCollectionId: "clientes" }]
            : [{ name: "nombre", fieldType: "TEXT" }],
        ),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.eagerDepth).toBe(1);
    expect(result.value.requiresFieldMetadata).toBe(true);
    expect(result.value.fieldMetadataPaths).toEqual(["cliente.nombre"]);
  });
});
