import { Result } from "@/shared/domain/result";

import { Collection } from "../entities/collection.entity";

export interface ICollectionRepository {
  findById(id: string): Promise<Result<Collection | null>>;
  findByAccountId(accountId: string): Promise<Result<Collection[]>>;
  create(collection: Collection): Promise<Result<Collection>>;
  update(collection: Collection): Promise<Result<Collection>>;
  delete(id: string): Promise<Result<void>>;
  count(accountId: string): Promise<Result<number>>;
}
