import { DomainError, fail, ok, Result } from "@/shared/domain/result";

const VALID_FIELD_TYPES = [
  "TEXT",
  "NUMBER",
  "BOOLEAN",
  "DATE",
  "ENUM",
  "RELATION",
  "FILE",
  "LOCATION",
] as const;

export type FieldTypeValue = (typeof VALID_FIELD_TYPES)[number];

export class FieldType {
  private constructor(public readonly value: FieldTypeValue) {}

  static create(raw: string): Result<FieldType> {
    const upper = raw.toUpperCase() as FieldTypeValue;
    if (!VALID_FIELD_TYPES.includes(upper)) {
      return fail(
        new DomainError(
          `Invalid field type: ${raw}. Must be one of: ${VALID_FIELD_TYPES.join(", ")}`,
          "INVALID_FIELD_TYPE",
        ),
      );
    }
    return ok(new FieldType(upper));
  }

  equals(other: FieldType): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
