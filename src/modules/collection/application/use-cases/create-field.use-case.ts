import { IFieldRepository } from '../../domain/ports/field-repository.port'
import { Field } from '../../domain/entities/field.entity'
import { FieldType } from '../../domain/value-objects/field-type.vo'
import { FieldConfig } from '../../domain/value-objects/field-config.vo'
import { Result, ok, fail } from '@/shared/domain/result'

export interface CreateFieldRequest {
  collectionId: string
  name: string
  displayName?: string
  fieldType: string
  isRequired?: boolean
  isUnique?: boolean
  defaultValue?: string
  config?: Record<string, unknown>
  sortOrder?: number
}

export class CreateFieldUseCase {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async execute(request: CreateFieldRequest): Promise<Result<Field>> {
    // 1. Validate field type
    const fieldTypeRes = FieldType.create(request.fieldType)
    if (!fieldTypeRes.ok) return fail(fieldTypeRes.error)

    // 2. Validate config
    const fieldConfigRes = FieldConfig.create(fieldTypeRes.value.value, request.config || {})
    if (!fieldConfigRes.ok) return fail(fieldConfigRes.error)

    // 3. Create entity
    const field = new Field({
      id: crypto.randomUUID(),
      collectionId: request.collectionId,
      name: request.name,
      displayName: request.displayName,
      fieldType: fieldTypeRes.value,
      isRequired: request.isRequired,
      isUnique: request.isUnique,
      defaultValue: request.defaultValue,
      config: fieldConfigRes.value,
      sortOrder: request.sortOrder,
    })

    // 4. Persistence
    return this.fieldRepository.create(field)
  }
}
