import { ICollectionRepository } from '../../domain/ports/collection-repository.port'
import { Collection } from '../../domain/entities/collection.entity'
import { Result } from '@/shared/domain/result'

export class ListCollectionsUseCase {
  constructor(private collectionRepository: ICollectionRepository) {}

  public async execute(accountId: string): Promise<Result<Collection[]>> {
    return this.collectionRepository.findByAccountId(accountId)
  }
}
