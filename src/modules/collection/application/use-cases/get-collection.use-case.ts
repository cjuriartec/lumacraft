import { Result } from "@/shared/domain/result";

import { Collection } from "../../domain/entities/collection.entity";
import { ICollectionRepository } from "../../domain/ports/collection-repository.port";

export class GetCollectionUseCase {
  constructor(private readonly collectionRepository: ICollectionRepository) {}

  async execute(id: string): Promise<Result<Collection | null>> {
    return this.collectionRepository.findById(id);
  }
}
