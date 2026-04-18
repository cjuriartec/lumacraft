import { BaseEntity } from "@/shared/domain/base-entity";
import { fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";

interface WorkspaceProps {
  id: string;
  name: DisplayName;
  ownerId: string;
  settings?: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Workspace extends BaseEntity {
  private props: WorkspaceProps;

  constructor(props: WorkspaceProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get name(): string {
    return this.props.name.value;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get settings(): Record<string, unknown> | undefined {
    return this.props.settings;
  }

  get isActive(): boolean {
    return this.props.isActive ?? true;
  }

  public static create(props: {
    id: string;
    name: string;
    ownerId: string;
    settings?: Record<string, unknown>;
    isActive?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<Workspace> {
    const nameResult = DisplayName.create(props.name, "Workspace Name");
    if (!nameResult.ok) return fail(nameResult.error);

    return ok(
      new Workspace({
        ...props,
        name: nameResult.value,
      }),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
      settings: this.settings,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
