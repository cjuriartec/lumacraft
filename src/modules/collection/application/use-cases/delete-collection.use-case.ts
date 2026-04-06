import { Result } from "@/shared/domain/result";

import { ICollectionRepository } from "../../domain/ports/collection-repository.port";

export class DeleteCollectionUseCase {
  constructor(private collectionRepository: ICollectionRepository) {}

  public async execute(id: string): Promise<Result<void>> {
    return this.collectionRepository.delete(id);
  }
}
