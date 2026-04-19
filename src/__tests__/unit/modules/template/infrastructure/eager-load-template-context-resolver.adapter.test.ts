import { describe, expect, it, vi } from "vitest";

import { EagerLoadTemplateContextResolverAdapter } from "@/modules/template/infrastructure/adapters/eager-load-template-context-resolver.adapter";
import { ok } from "@/shared/domain/result";

describe("EagerLoadTemplateContextResolverAdapter", () => {
  it("skips field metadata and collection lookups when the template has no AI blocks", async () => {
    const eagerLoadExecute = vi.fn(async () =>
      ok({
        id: "record-1",
        collectionId: "collection-1",
        collectionName: "Clientes",
        data: {
          nombre: "Ana",
          estado: "ACTIVO",
          edad: 30,
        },
        relations: {},
      }),
    );
    const listFieldsExecute = vi.fn(async () =>
      ok([
        {
          name: "nombre",
          displayName: "Nombre",
          description: "Nombre del cliente",
          fieldType: { value: "TEXT" },
          isRequired: false,
          isUnique: false,
          config: { value: {} },
        },
      ]),
    );
    const getCollectionExecute = vi.fn(async () =>
      ok({
        description: "Clientes del workspace",
      }),
    );

    const adapter = new EagerLoadTemplateContextResolverAdapter(
      { execute: eagerLoadExecute } as never,
      { execute: listFieldsExecute } as never,
      { execute: getCollectionExecute } as never,
    );

    const result = await adapter.resolve({
      collectionId: "collection-1",
      recordId: "record-1",
      dependencyPlan: {
        blockMetadata: [],
        referencedPaths: ["nombre"],
        relationPaths: ["nombre"],
        aiBlocks: [],
        imagePaths: [],
        depth: 0,
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.root).toEqual({ nombre: "Ana" });
    expect(result.value.fieldMetadataByPath).toBeUndefined();
    expect(result.value.collectionDescription).toBeNull();
    expect(getCollectionExecute).not.toHaveBeenCalled();
    expect(listFieldsExecute).toHaveBeenCalledTimes(1);
    expect(eagerLoadExecute).toHaveBeenCalledWith({
      collectionId: "collection-1",
      recordId: "record-1",
      depth: 0,
      includeFields: undefined,
      includeRelationPaths: [],
    });
  });
});
