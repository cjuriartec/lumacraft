import { describe, expect, it } from "vitest";

import { ValueObject } from "@/shared/domain/value-object";

class TestValueObject extends ValueObject<{ value: string }> {}

describe("shared/domain/value-object", () => {
  it("compares value objects by frozen props", () => {
    const left = new TestValueObject({ value: "same" });
    const right = new TestValueObject({ value: "same" });

    expect(left.equals(right)).toBe(true);
  });

  it("returns false when comparing against undefined", () => {
    const left = new TestValueObject({ value: "same" });

    expect(left.equals(undefined)).toBe(false);
  });

  it("returns false for different values", () => {
    const left = new TestValueObject({ value: "left" });
    const right = new TestValueObject({ value: "right" });

    expect(left.equals(right)).toBe(false);
  });
});
