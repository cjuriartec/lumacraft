import { BaseEntity } from "@/shared/domain/base-entity";
import { fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";
import { Identifier } from "@/shared/domain/value-objects/identifier.vo";

import { FieldConfig } from "../value-objects/field-config.vo";
import { FieldType } from "../value-objects/field-type.vo";

interface FieldProps {
  id: string;
  collectionId: string;
  name: Identifier;
  displayName?: DisplayName;
  description?: string;
  fieldType: FieldType;
  isRequired?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  config?: FieldConfig;
  sortOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Field extends BaseEntity {
  private props: FieldProps;

  constructor(props: FieldProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get collectionId(): string {
    return this.props.collectionId;
  }

  get name(): string {
    return this.props.name.value;
  }

  get displayName(): string | undefined {
    return this.props.displayName?.value;
  }

  public static create(props: {
    id: string;
    collectionId: string;
    name: string;
    displayName?: string;
    description?: string;
    fieldType: FieldType;
    isRequired?: boolean;
    isUnique?: boolean;
    defaultValue?: string;
    config?: FieldConfig;
    sortOrder?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<Field> {
    const nameResult = Identifier.create(props.name, "Name");
    if (!nameResult.ok) return fail(nameResult.error);

    const displayNameResult = props.displayName
      ? DisplayName.create(props.displayName, "Display Name")
      : ok(undefined);
    if (!displayNameResult.ok) return fail(displayNameResult.error);

    return ok(
      new Field({
        ...props,
        name: nameResult.value,
        displayName: displayNameResult.value as DisplayName | undefined,
      }),
    );
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get fieldType(): FieldType {
    return this.props.fieldType;
  }

  get isRequired(): boolean {
    return this.props.isRequired || false;
  }

  get isUnique(): boolean {
    return this.props.isUnique || false;
  }

  get defaultValue(): string | undefined {
    return this.props.defaultValue;
  }

  get config(): FieldConfig | undefined {
    return this.props.config;
  }

  get sortOrder(): number {
    return this.props.sortOrder || 0;
  }

  public toJSON() {
    return {
      id: this.id,
      collectionId: this.collectionId,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      fieldType: this.fieldType.value,
      isRequired: this.isRequired,
      isUnique: this.isUnique,
      defaultValue: this.defaultValue,
      config: this.config?.value || {},
      sortOrder: this.sortOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
