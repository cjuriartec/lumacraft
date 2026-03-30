import { ValueObject } from '@/shared/domain/value-object'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'

interface EmailProps {
  value: string
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props)
  }

  public static create(email: string): Result<Email> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return fail(new DomainError('Invalid email format', 'INVALID_EMAIL'))
    }
    return ok(new Email({ value: email.toLowerCase() }))
  }

  get value(): string {
    return this.props.value
  }
}
