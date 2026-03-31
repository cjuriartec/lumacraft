import { IRecordRepository } from '../../domain/ports/record-repository.port'
import { DataRecord } from '../../domain/entities/record.entity'
import { Result } from '@/shared/domain/result'
import { PaginationOptions, PaginatedResult } from '../../domain/types/pagination.types'

export class ListRecordsUseCase {
  constructor(private readonly recordRepository: IRecordRepository) {}

  async execute(collectionId: string, options: PaginationOptions): Promise<Result<PaginatedResult<DataRecord>>> {
    return this.recordRepository.findByCollectionId(collectionId, options)
  }
}
