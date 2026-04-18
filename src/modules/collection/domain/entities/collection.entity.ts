import { BaseEntity } from "@/shared/domain/base-entity";
import { fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";
import { Identifier } from "@/shared/domain/value-objects/identifier.vo";

export interface CollectionSettings {
  hideIdColumn?: boolean;
}

interface CollectionProps {
  id: string;
  accountId: string;
  name: Identifier;
  displayName?: DisplayName;
  description?: string;
  icon?: string;
  primaryFieldName?: string | null;
  settings?: CollectionSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Collection extends BaseEntity {
  private props: CollectionProps;

  constructor(props: CollectionProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get name(): string {
    return this.props.name.value;
  }

  get displayName(): string | undefined {
    return this.props.displayName?.value;
  }

  public static create(props: {
    id: string;
    accountId: string;
    name: string;
    displayName?: string;
    description?: string;
    icon?: string;
    primaryFieldName?: string | null;
    settings?: CollectionSettings;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<Collection> {
    const nameResult = Identifier.create(props.name, "Name");
    if (!nameResult.ok) return fail(nameResult.error);

    const displayNameResult = props.displayName
      ? DisplayName.create(props.displayName, "Display Name")
      : ok(undefined);
    if (!displayNameResult.ok) return fail(displayNameResult.error);

    return ok(
      new Collection({
        ...props,
        name: nameResult.value,
        displayName: displayNameResult.value as DisplayName | undefined,
      }),
    );
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get icon(): string | undefined {
    return this.props.icon;
  }

  get primaryFieldName(): string | undefined | null {
    return this.props.primaryFieldName;
  }

  get settings(): CollectionSettings {
    return this.props.settings || {};
  }

  public toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      icon: this.icon,
      primaryFieldName: this.primaryFieldName,
      settings: this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
