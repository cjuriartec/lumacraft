import { BaseEntity } from '@/shared/domain/base-entity'
import { Email } from '../value-objects/email.vo'

export interface UserProps {
  id: string
  email: Email
  fullName?: string
  avatarUrl?: string
  createdAt?: Date
  updatedAt?: Date
}

export class User extends BaseEntity {
  private props: UserProps

  constructor(props: UserProps) {
    super(props.id, props.createdAt, props.updatedAt)
    this.props = props
  }

  get email(): Email {
    return this.props.email
  }

  get fullName(): string | undefined {
    return this.props.fullName
  }

  get avatarUrl(): string | undefined {
    return this.props.avatarUrl
  }

  public toJSON() {
    return {
      id: this.id,
      email: this.email.value,
      fullName: this.fullName,
      avatarUrl: this.avatarUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
