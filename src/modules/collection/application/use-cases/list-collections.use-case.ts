import { Result } from "@/shared/domain/result";

import { Collection } from "../../domain/entities/collection.entity";
import { ICollectionRepository } from "../../domain/ports/collection-repository.port";

export class ListCollectionsUseCase {
  constructor(private collectionRepository: ICollectionRepository) {}

  public async execute(accountId: string): Promise<Result<Collection[]>> {
    return this.collectionRepository.findByAccountId(accountId);
  }
}
