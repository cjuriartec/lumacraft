import { BaseEntity } from '@/shared/domain/base-entity'

interface CollectionProps {
  id: string
  accountId: string
  name: string
  displayName?: string
  description?: string
  icon?: string
  createdAt?: Date
  updatedAt?: Date
}

export class Collection extends BaseEntity {
  private props: CollectionProps

  constructor(props: CollectionProps) {
    super(props.id, props.createdAt, props.updatedAt)
    this.props = props
  }

  get accountId(): string {
    return this.props.accountId
  }

  get name(): string {
    return this.props.name
  }

  get displayName(): string | undefined {
    return this.props.displayName
  }

  get description(): string | undefined {
    return this.props.description
  }

  get icon(): string | undefined {
    return this.props.icon
  }

  public toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      icon: this.icon,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
