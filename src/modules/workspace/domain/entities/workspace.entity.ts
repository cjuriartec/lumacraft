import { BaseEntity } from '@/shared/domain/base-entity'

interface WorkspaceProps {
  id: string
  name: string
  ownerId: string
  settings?: Record<string, unknown>
  isActive?: boolean
  createdAt?: Date
  updatedAt?: Date
}

export class Workspace extends BaseEntity {
  private props: WorkspaceProps

  constructor(props: WorkspaceProps) {
    super(props.id, props.createdAt, props.updatedAt)
    this.props = props
  }

  get name(): string {
    return this.props.name
  }

  get ownerId(): string {
    return this.props.ownerId
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
