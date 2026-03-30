import { ICollectionRepository } from '../../domain/ports/collection-repository.port'
import { Collection } from '../../domain/entities/collection.entity'
import { Result } from '@/shared/domain/result'

export class CreateCollectionUseCase {
  constructor(private collectionRepository: ICollectionRepository) {}

  public async execute(params: {
    accountId: string
    name: string
    displayName?: string
    description?: string
    icon?: string
  }): Promise<Result<Collection>> {
    const collection = new Collection({
      id: crypto.randomUUID(),
      accountId: params.accountId,
      name: params.name,
      displayName: params.displayName,
      description: params.description,
      icon: params.icon,
    })
    return this.collectionRepository.create(collection)
  }
}
