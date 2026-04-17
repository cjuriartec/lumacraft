import { describe, expect, it } from "vitest";

import { makeField, resetFactories } from "@/__tests__/factories/domain-factories";
import { reorderFieldsLocally } from "@/modules/collection/presentation/hooks/use-fields";

describe("useFields", () => {
  it("reorders fields locally without losing their data", () => {
    resetFactories();
    const firstField = makeField({
      id: "field-1",
      collectionId: "collection-1",
      name: "title",
      displayName: "Title",
      config: { hidden: false },
      sortOrder: 0,
    });
    const secondField = makeField({
      id: "field-2",
      collectionId: "collection-1",
      name: "status",
      displayName: "Status",
      fieldType: "ENUM",
      config: { options: ["draft", "published"], hidden: true },
      sortOrder: 1,
    });

    const reordered = reorderFieldsLocally([firstField, secondField], ["field-2", "field-1"]);

    expect(reordered.map((field) => field.id)).toEqual(["field-2", "field-1"]);
    expect(reordered.map((field) => field.sortOrder)).toEqual([0, 1]);
    expect(reordered[0].fieldType.value).toBe("ENUM");
    expect(reordered[0].config?.value).toMatchObject({
      options: ["draft", "published"],
      hidden: true,
    });
    expect(reordered[1].displayName).toBe("Title");
  });
});
