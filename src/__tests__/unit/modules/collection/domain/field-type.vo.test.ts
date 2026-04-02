import { describe, expect, it } from "vitest";

import { FieldType } from "@/modules/collection/domain/value-objects/field-type.vo";

describe("FieldType value object", () => {
  it("normalizes valid types to uppercase", () => {
    const result = FieldType.create("number");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.value).toBe("NUMBER");
      expect(result.value.toString()).toBe("NUMBER");
    }
  });

  it("compares equal field types", () => {
    const left = FieldType.create("text");
    const right = FieldType.create("TEXT");

    expect(left.ok && right.ok && left.value.equals(right.value)).toBe(true);
  });

  it("accepts advanced sprint 3 types", () => {
    const relation = FieldType.create("RELATION");
    const file = FieldType.create("FILE");
    const location = FieldType.create("LOCATION");

    expect(relation.ok).toBe(true);
    expect(file.ok).toBe(true);
    expect(location.ok).toBe(true);
  });

  it("fails for unsupported types", () => {
    const result = FieldType.create("CURRENCY");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("INVALID_FIELD_TYPE");
    }
  });
});
