import { Result } from '@/shared/domain/result'
import { EagerLoadedRecord } from '../types/eager-loading.types'

export interface IEagerLoadRepository {
  /**
   * Resolves a record and its relations recursively up to a specified depth.
   */
  resolveRecursive(
    recordId: string,
    collectionId: string,
    depth: number,
    visited: Set<string>,
    includeFields?: string[]
  ): Promise<Result<EagerLoadedRecord>>

  /**
   * Fetches metadata for a collection (name, display_name).
   */
  getCollectionMetadata(collectionId: string): Promise<Result<{ name: string; display_name: string | null }>>

  /**
   * Fetches the raw data of a record.
   */
  getRecordData(recordId: string): Promise<Result<{ id: string; data: any }>>

  /**
   * Fetches all relation fields for a given collection.
   */
  getRelationFields(collectionId: string): Promise<Result<any[]>>

  /**
   * Fetches all related record IDs for a specific field and source record.
   */
  getRelations(fieldId: string, sourceRecordId: string): Promise<Result<string[]>>
}
