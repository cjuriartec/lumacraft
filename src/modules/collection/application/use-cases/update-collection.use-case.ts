import { ICollectionRepository } from '../../domain/ports/collection-repository.port'
import { Collection } from '../../domain/entities/collection.entity'
import { DomainError, Result, fail } from '@/shared/domain/result'

export interface UpdateCollectionRequest {
  id: string
  accountId: string
  name: string
  displayName?: string
  description?: string
  icon?: string
  primaryFieldName?: string | null
}

export class UpdateCollectionUseCase {
  constructor(private collectionRepository: ICollectionRepository) {}

  public async execute(request: UpdateCollectionRequest): Promise<Result<Collection>> {
    const existing = await this.collectionRepository.findById(request.id)

    if (!existing.ok) {
      return fail(existing.error)
    }

    if (!existing.value) {
      return fail(new DomainError('Collection not found', 'COLLECTION_NOT_FOUND'))
    }

    if (existing.value.accountId !== request.accountId) {
      return fail(new DomainError('Collection does not belong to this account', 'COLLECTION_ACCOUNT_MISMATCH'))
    }

    const collection = new Collection({
      ...existing.value.toJSON(),
      ...request,
    })

    return this.collectionRepository.update(collection)
  }
}
