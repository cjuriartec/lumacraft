import { describe, expect, it } from "vitest";

import {
  buildCollectionIdSet,
  filterAccessibleCollections,
  filterTemplatesByAccessibleCollections,
} from "@/shared/lib/workspace-access";

describe("workspace access helpers", () => {
  it("filters collections by read permission for non-admin users", () => {
    const collections = [{ id: "collection-1" }, { id: "collection-2" }];

    const result = filterAccessibleCollections(collections, false, (collectionId) => {
      return collectionId === "collection-1";
    });

    expect(result).toEqual([{ id: "collection-1" }]);
  });

  it("keeps all collections for users with full access", () => {
    const collections = [{ id: "collection-1" }, { id: "collection-2" }];

    const result = filterAccessibleCollections(collections, true, () => false);

    expect(result).toEqual(collections);
  });

  it("filters templates using accessible collection ids", () => {
    const templates = [
      { id: "template-1", collectionId: "collection-1" },
      { id: "template-2", collectionId: "collection-2" },
    ];

    const result = filterTemplatesByAccessibleCollections(
      templates,
      buildCollectionIdSet([{ id: "collection-1" }]),
    );

    expect(result).toEqual([{ id: "template-1", collectionId: "collection-1" }]);
  });
});
