import { BaseEntity } from "@/shared/domain/base-entity";
import { fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";

interface RoleProps {
  id: string;
  accountId: string;
  name: DisplayName;
  description: string | null;
  isSuperadmin: boolean;
  createdAt?: Date;
}

export class Role extends BaseEntity {
  private props: RoleProps;

  constructor(props: RoleProps) {
    super(props.id, props.createdAt);
    this.props = props;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get name(): string {
    return this.props.name.value;
  }

  public static create(props: {
    id: string;
    accountId: string;
    name: string;
    description: string | null;
    isSuperadmin: boolean;
    createdAt?: Date;
  }): Result<Role> {
    const nameResult = DisplayName.create(props.name, "Role Name");
    if (!nameResult.ok) return fail(nameResult.error);

    return ok(
      new Role({
        ...props,
        name: nameResult.value,
      }),
    );
  }

  get description(): string | null {
    return this.props.description;
  }

  get isSuperadmin(): boolean {
    return this.props.isSuperadmin;
  }

  public toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      name: this.name,
      description: this.description,
      isSuperadmin: this.isSuperadmin,
      createdAt: this.createdAt,
    };
  }
}
