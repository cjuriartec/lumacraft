import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { ValueObject } from "@/shared/domain/value-object";

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  public static create(email: string): Result<Email> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return fail(new DomainError("Invalid email format", "INVALID_EMAIL"));
    }
    return ok(new Email({ value: email.toLowerCase() }));
  }

  get value(): string {
    return this.props.value;
  }
}
