import { DomainError, fail, ok, Result } from "../result";
import { ValueObject } from "../value-object";

interface IdentifierProps {
  value: string;
}

export class Identifier extends ValueObject<IdentifierProps> {
  public static create(
    value: string | undefined | null,
    fieldName: string = "Identifier",
  ): Result<Identifier> {
    if (value === undefined || value === null || value.trim() === "") {
      return fail(new DomainError(`${fieldName} cannot be empty`, "INVALID_INPUT"));
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      return fail(
        new DomainError(`${fieldName} must be at least 2 characters long`, "INVALID_INPUT"),
      );
    }

    // Slug-like validation: lowercase, alphanumeric, hyphens, underscores
    // Note: We might want a more relaxed version for Display Names,
    // but for internal names (collection/field names) we should be strict.
    const slugRegex = /^[a-z0-9-_]+$/;
    if (!slugRegex.test(trimmed)) {
      return fail(
        new DomainError(
          `${fieldName} must contain only lowercase letters, numbers, hyphens or underscores`,
          "INVALID_INPUT",
        ),
      );
    }

    return ok(new Identifier({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }
}
