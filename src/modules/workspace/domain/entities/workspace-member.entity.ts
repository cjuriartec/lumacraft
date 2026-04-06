import { Email } from "@/modules/auth/domain/value-objects/email.vo";
import { BaseEntity } from "@/shared/domain/base-entity";
import { fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";

interface WorkspaceMemberProps {
  id: string;
  workspaceId: string;
  userId: string;
  roleId: string;
  userName?: DisplayName;
  userEmail?: Email;
  userAvatarUrl?: string;
  joinedAt?: Date;
}

export class WorkspaceMember extends BaseEntity {
  private props: WorkspaceMemberProps;

  constructor(props: WorkspaceMemberProps) {
    super(props.id, props.joinedAt);
    this.props = props;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get roleId(): string {
    return this.props.roleId;
  }

  get userName(): string | undefined {
    return this.props.userName?.value;
  }

  get userEmail(): string | undefined {
    return this.props.userEmail?.value;
  }

  get userAvatarUrl(): string | undefined {
    return this.props.userAvatarUrl;
  }

  public static create(props: {
    id: string;
    workspaceId: string;
    userId: string;
    roleId: string;
    userName?: string;
    userEmail?: string;
    userAvatarUrl?: string;
    joinedAt?: Date;
  }): Result<WorkspaceMember> {
    const userNameResult = props.userName
      ? DisplayName.create(props.userName, "User Name")
      : ok(undefined);
    if (!userNameResult.ok) return fail(userNameResult.error);

    const userEmailResult = props.userEmail ? Email.create(props.userEmail) : ok(undefined);
    if (!userEmailResult.ok) return fail(userEmailResult.error);

    return ok(
      new WorkspaceMember({
        ...props,
        userName: userNameResult.value as DisplayName | undefined,
        userEmail: userEmailResult.value as Email | undefined,
      }),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      userId: this.userId,
      roleId: this.roleId,
      userName: this.userName,
      userEmail: this.userEmail,
      userAvatarUrl: this.userAvatarUrl,
      joinedAt: this.createdAt,
    };
  }
}
