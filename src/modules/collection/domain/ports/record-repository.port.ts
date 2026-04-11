import { Result } from "@/shared/domain/result";

import { DataRecord } from "../entities/record.entity";
import { PaginatedResult, PaginationOptions } from "../types/pagination.types";

export interface IRecordRepository {
  findByCollectionId(
    collectionId: string,
    options: PaginationOptions,
  ): Promise<Result<PaginatedResult<DataRecord>>>;
  findById(id: string): Promise<Result<DataRecord | null>>;
  create(record: DataRecord, omitFields?: string[]): Promise<Result<DataRecord>>;
  update(record: DataRecord, omitFields?: string[]): Promise<Result<DataRecord>>;
  delete(id: string): Promise<Result<void>>;
  deleteFieldData(collectionId: string, fieldName: string): Promise<Result<void>>;
  count(collectionId: string): Promise<Result<number>>;
  findByFieldValue(
    collectionId: string,
    fieldName: string,
    value: unknown | unknown[],
  ): Promise<Result<DataRecord[]>>;
}
