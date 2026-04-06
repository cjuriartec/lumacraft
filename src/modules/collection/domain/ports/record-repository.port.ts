import { Result } from "@/shared/domain/result";

import { DataRecord } from "../entities/record.entity";
import { PaginatedResult, PaginationOptions } from "../types/pagination.types";

export interface IRecordRepository {
  findByCollectionId(
    collectionId: string,
    options: PaginationOptions,
  ): Promise<Result<PaginatedResult<DataRecord>>>;
  findById(id: string): Promise<Result<DataRecord | null>>;
  create(record: DataRecord): Promise<Result<DataRecord>>;
  update(record: DataRecord): Promise<Result<DataRecord>>;
  delete(id: string): Promise<Result<void>>;
  count(collectionId: string): Promise<Result<number>>;
  findByFieldValue(
    collectionId: string,
    fieldName: string,
    value: unknown,
  ): Promise<Result<DataRecord[]>>;
}
