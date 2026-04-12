import { describe, expect, it } from "vitest";

import {
  flattenCatalog,
  getFieldSemantics,
  getNodeByPath,
  isIterableRelation,
} from "@/modules/template/presentation/lib/template-field-semantics";
import { TemplateVariableCatalogNode } from "@/modules/template/presentation/types/template-variable-catalog";

describe("template field semantics", () => {
  it("uses presence-only operators for file/image/relation fields", () => {
    expect(getFieldSemantics("FILE").operators).toEqual(["is_empty", "not_empty"]);
    expect(getFieldSemantics("IMAGE").operators).toEqual(["is_empty", "not_empty"]);
    expect(getFieldSemantics("RELATION").switchComparable).toBe(false);
    expect(getFieldSemantics("REVERSE_LOOKUP").operators).toEqual(["is_empty", "not_empty"]);
    expect(getFieldSemantics("REVERSE_LOOKUP").switchComparable).toBe(false);
  });

  it("supports switch comparability only for comparable scalar fields", () => {
    expect(getFieldSemantics("BOOLEAN").switchComparable).toBe(true);
    expect(getFieldSemantics("NUMBER").operators).toContain("gt");
    expect(getFieldSemantics("TEXT").operators).toContain("contains");
  });

  it("flattens and resolves nodes by path", () => {
    const catalog: TemplateVariableCatalogNode[] = [
      {
        path: "cliente",
        displayName: "Cliente",
        fieldType: "RELATION",
        collectionId: "c1",
        cardinality: "ONE_TO_ONE",
        children: [
          {
            path: "cliente.nombre",
            displayName: "Nombre",
            fieldType: "TEXT",
            collectionId: "c2",
          },
        ],
      },
    ];

    const flattened = flattenCatalog(catalog);
    const node = getNodeByPath(catalog, "cliente.nombre");

    expect(flattened).toHaveLength(2);
    expect(node?.displayName).toBe("Nombre");
  });

  it("detects iterable relations by cardinality", () => {
    expect(isIterableRelation("ONE_TO_MANY")).toBe(true);
    expect(isIterableRelation("MANY_TO_MANY")).toBe(true);
    expect(isIterableRelation("ONE_TO_ONE")).toBe(false);
    expect(isIterableRelation(null)).toBe(false);
  });
});
