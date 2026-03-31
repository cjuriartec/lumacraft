import { BaseEntity } from '@/shared/domain/base-entity'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { Field } from './field.entity'

interface DataRecordProps {
  id: string
  collectionId: string
  accountId: string
  data: Record<string, unknown>
  createdBy?: string
  updatedBy?: string
  createdAt?: Date
  updatedAt?: Date
}

export class DataRecord extends BaseEntity {
  private props: DataRecordProps

  constructor(props: DataRecordProps) {
    super(props.id, props.createdAt, props.updatedAt)
    this.props = props
  }

  get collectionId(): string {
    return this.props.collectionId
  }

  get accountId(): string {
    return this.props.accountId
  }

  get data(): Record<string, unknown> {
    return this.props.data
  }

  get createdBy(): string | undefined {
    return this.props.createdBy
  }

  get updatedBy(): string | undefined {
    return this.props.updatedBy
  }

  /**
   * Validates the record data against a collection schema (fields)
   */
  public validateAgainstSchema(fields: Field[]): Result<void> {
    for (const field of fields) {
      const value = this.data[field.name]

      // Check required
      if (field.isRequired && (value === undefined || value === null || value === '')) {
        return fail(new DomainError(`Field ${field.displayName || field.name} is required`, 'REQUIRED_FIELD_MISSING'))
      }

      // If value is provided, validate type (simple check for now, can be more robust)
      if (value !== undefined && value !== null) {
        const typeValue = field.fieldType.value

        if (typeValue === 'NUMBER' && typeof value !== 'number' && isNaN(Number(value))) {
          return fail(new DomainError(`Field ${field.displayName || field.name} must be a number`, 'INVALID_TYPE'))
        }

        if (typeValue === 'BOOLEAN' && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          return fail(new DomainError(`Field ${field.displayName || field.name} must be a boolean`, 'INVALID_TYPE'))
        }

        if (typeValue === 'ENUM') {
          const options = (field.config?.value as any)?.options as string[] | undefined
          if (options && !options.includes(String(value))) {
            return fail(new DomainError(`Value ${value} is not a valid option for ${field.displayName || field.name}`, 'INVALID_ENUM_VALUE'))
          }
        }
      }
    }

    return ok(undefined)
  }

  public toJSON() {
    return {
      id: this.id,
      collectionId: this.collectionId,
      accountId: this.accountId,
      data: this.data,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
