import { DomainError, fail, ok, Result } from "../result";
import { ValueObject } from "../value-object";

interface DisplayNameProps {
  value: string;
}

export class DisplayName extends ValueObject<DisplayNameProps> {
  public static create(
    value: string | undefined | null,
    fieldName: string = "Display Name",
  ): Result<DisplayName> {
    if (value === undefined || value === null || value.trim() === "") {
      return fail(new DomainError(`${fieldName} cannot be empty`, "INVALID_INPUT"));
    }

    const trimmed = value.trim();
    if (trimmed.length > 50) {
      return fail(
        new DomainError(`${fieldName} must be at most 50 characters long`, "INVALID_INPUT"),
      );
    }

    return ok(new DisplayName({ value: trimmed }));
  }

  get value(): string {
    return this.props.value;
  }

  public toString(): string {
    return this.props.value;
  }
}
