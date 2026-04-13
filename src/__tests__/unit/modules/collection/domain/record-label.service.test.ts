import { describe, expect, it } from "vitest";

import { makeCollection, makeRecord, resetFactories } from "@/__tests__/factories/domain-factories";
import {
  formatShortRecordId,
  resolveCollectionRecordLabel,
  resolveRecordLabel,
  toRecordLabelValue,
} from "@/modules/collection/domain/services/record-label.service";

describe("record label service", () => {
  it("extracts readable labels from primitives, objects and arrays", () => {
    expect(toRecordLabelValue("  Cliente Uno  ")).toBe("Cliente Uno");
    expect(toRecordLabelValue(42)).toBe("42");
    expect(toRecordLabelValue({ displayName: "ACME" })).toBe("ACME");
    expect(toRecordLabelValue(["uno", { name: "dos" }])).toBe("uno, dos");
  });

  it("resolves the record label from the primary field and falls back to short id", () => {
    resetFactories();
    const withPrimaryValue = {
      id: "abcd1234-1111-4111-8111-111111111111",
      data: { title: "Proyecto Atlas" },
    };
    const withoutPrimaryValue = {
      id: "dcba4321-2222-4222-8222-222222222222",
      data: { title: "" },
    };

    expect(resolveRecordLabel(withPrimaryValue, "title")).toBe("Proyecto Atlas");
    expect(resolveRecordLabel(withoutPrimaryValue, "title")).toBe("dcba4321");
    expect(formatShortRecordId(withoutPrimaryValue.id)).toBe("dcba4321");
  });

  it("resolves labels from collection entities with the same fallback policy", () => {
    resetFactories();
    const collection = makeCollection({
      id: "collection-1",
      primaryFieldName: "name",
    });
    const record = makeRecord({
      id: "12345678-3333-4333-8333-333333333333",
      collectionId: collection.id,
      data: { name: "Cliente Norte" },
    });

    expect(resolveCollectionRecordLabel(record, collection)).toBe("Cliente Norte");
  });
});
