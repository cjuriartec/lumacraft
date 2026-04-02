import { BaseEntity } from '@/shared/domain/base-entity'

interface RoleProps {
  id: string
  accountId: string
  name: string
  description: string | null
  isSuperadmin: boolean
  createdAt?: Date
}

export class Role extends BaseEntity {
  private props: RoleProps

  constructor(props: RoleProps) {
    super(props.id, props.createdAt)
    this.props = props
  }

  get accountId(): string {
    return this.props.accountId
  }

  get name(): string {
    return this.props.name
  }

  get description(): string | null {
    return this.props.description
  }

  get isSuperadmin(): boolean {
    return this.props.isSuperadmin
  }

  public toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      name: this.name,
      description: this.description,
      isSuperadmin: this.isSuperadmin,
      createdAt: this.createdAt,
    }
  }
}
