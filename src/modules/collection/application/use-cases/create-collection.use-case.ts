import { Result } from "@/shared/domain/result";

import { Collection } from "../../domain/entities/collection.entity";
import { ICollectionRepository } from "../../domain/ports/collection-repository.port";

export class CreateCollectionUseCase {
  constructor(private collectionRepository: ICollectionRepository) {}

  public async execute(params: {
    accountId: string;
    name: string;
    displayName?: string;
    description?: string;
    icon?: string;
  }): Promise<Result<Collection>> {
    const result = Collection.create({
      id: crypto.randomUUID(),
      accountId: params.accountId,
      name: params.name,
      displayName: params.displayName,
      description: params.description,
      icon: params.icon,
    });

    if (!result.ok) {
      return result;
    }

    return this.collectionRepository.create(result.value);
  }
}
