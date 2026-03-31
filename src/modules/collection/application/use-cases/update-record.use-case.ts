import { IRecordRepository } from '../../domain/ports/record-repository.port'
import { IFieldRepository } from '../../domain/ports/field-repository.port'
import { DataRecord } from '../../domain/entities/record.entity'
import { Result, fail, DomainError } from '@/shared/domain/result'

interface UpdateRecordRequest {
  id: string
  collectionId: string
  accountId: string
  data: Record<string, unknown>
  userId?: string
}

export class UpdateRecordUseCase {
  constructor(
    private readonly recordRepository: IRecordRepository,
    private readonly fieldRepository: IFieldRepository
  ) {}

  async execute(request: UpdateRecordRequest): Promise<Result<DataRecord>> {
    // 1. Get collection schema (fields)
    const fieldsRes = await this.fieldRepository.findByCollectionId(request.collectionId)
    if (!fieldsRes.ok) return fail(fieldsRes.error)
    const fields = fieldsRes.value

    // 2. Uniqueness check
    for (const field of fields) {
      if (field.isUnique) {
        const val = request.data[field.name]
        if (val !== undefined && val !== null && val !== '') {
          const existing = await this.recordRepository.findByFieldValue(request.collectionId, field.name, val)
          if (existing.ok) {
            // Check if ANY of the existing records are NOT the one being updated
            const duplicates = existing.value.filter(r => r.id !== request.id)
            if (duplicates.length > 0) {
              return fail(new DomainError(
                `El valor "${val}" para el campo "${field.displayName || field.name}" ya está en uso por otro registro.`,
                'DUPLICATE_VALUE'
              ))
            }
          }
        }
      }
    }

    // 3. Create entity
    const record = new DataRecord({
      id: request.id,
      collectionId: request.collectionId,
      accountId: request.accountId,
      data: request.data,
      updatedBy: request.userId,
    })

    // 4. Validate against schema
    const validationRes = record.validateAgainstSchema(fields)
    if (!validationRes.ok) return fail(validationRes.error)

    // 5. Persistence
    return this.recordRepository.update(record)
  }
}
