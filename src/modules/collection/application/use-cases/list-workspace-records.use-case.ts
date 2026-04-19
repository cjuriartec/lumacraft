import { Result } from "@/shared/domain/result";

import { DataRecord } from "../../domain/entities/record.entity";
import { IRecordRepository } from "../../domain/ports/record-repository.port";
import { PaginatedResult, PaginationOptions } from "../../domain/types/pagination.types";

export class ListWorkspaceRecordsUseCase {
  constructor(private readonly recordRepository: IRecordRepository) {}

  async execute(
    collectionIds: string[],
    options: PaginationOptions,
  ): Promise<Result<PaginatedResult<DataRecord>>> {
    return this.recordRepository.findByCollectionIds(collectionIds, options);
  }
}
