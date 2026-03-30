import { BaseEntity } from '@/shared/domain/base-entity'

interface WorkspaceMemberProps {
  id: string
  workspaceId: string
  userId: string
  roleId: string
  joinedAt?: Date
}

export class WorkspaceMember extends BaseEntity {
  private props: WorkspaceMemberProps

  constructor(props: WorkspaceMemberProps) {
    super(props.id, props.joinedAt)
    this.props = props
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get userId(): string {
    return this.props.userId
  }

  get roleId(): string {
    return this.props.roleId
  }

  public toJSON() {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      userId: this.userId,
      roleId: this.roleId,
      joinedAt: this.createdAt,
    }
  }
}
