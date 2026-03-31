import { DataRecord } from '../entities/record.entity'
import { Result } from '@/shared/domain/result'
import { PaginationOptions, PaginatedResult } from '../types/pagination.types'

export interface IRecordRepository {
  findByCollectionId(collectionId: string, options: PaginationOptions): Promise<Result<PaginatedResult<DataRecord>>>
  findById(id: string): Promise<Result<DataRecord | null>>
  create(record: DataRecord): Promise<Result<DataRecord>>
  update(record: DataRecord): Promise<Result<DataRecord>>
  delete(id: string): Promise<Result<void>>
  count(collectionId: string): Promise<Result<number>>
  findByFieldValue(collectionId: string, fieldName: string, value: any): Promise<Result<DataRecord[]>>
}
