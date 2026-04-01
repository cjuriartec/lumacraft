import { BaseEntity } from '@/shared/domain/base-entity'
import { FieldType } from '../value-objects/field-type.vo'
import { FieldConfig } from '../value-objects/field-config.vo'

interface FieldProps {
  id: string
  collectionId: string
  name: string
  displayName?: string
  description?: string
  fieldType: FieldType
  isRequired?: boolean
  isUnique?: boolean
  defaultValue?: string
  config?: FieldConfig
  sortOrder?: number
  createdAt?: Date
  updatedAt?: Date
}

export class Field extends BaseEntity {
  private props: FieldProps

  constructor(props: FieldProps) {
    super(props.id, props.createdAt, props.updatedAt)
    this.props = props
  }

  get collectionId(): string {
    return this.props.collectionId
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

  get fieldType(): FieldType {
    return this.props.fieldType
  }

  get isRequired(): boolean {
    return this.props.isRequired || false
  }

  get isUnique(): boolean {
    return this.props.isUnique || false
  }

  get defaultValue(): string | undefined {
    return this.props.defaultValue
  }

  get config(): FieldConfig | undefined {
    return this.props.config
  }

  get sortOrder(): number {
    return this.props.sortOrder || 0
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
    }
  }
}
