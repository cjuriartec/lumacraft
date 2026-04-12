import { Result } from "@/shared/domain/result";

import { EagerLoadedRecord } from "../types/eager-loading.types";

export interface RawField {
  id: string;
  name: string;
  field_type: string;
  config: Record<string, unknown>;
}

export interface IEagerLoadRepository {
  /**
   * Resolves a record and its relations recursively up to a specified depth.
   */
  resolveRecursive(
    recordId: string,
    collectionId: string,
    depth: number,
    visited: Set<string>,
    includeFields?: string[],
    includeRelationPaths?: string[],
    currentPathPrefix?: string,
  ): Promise<Result<EagerLoadedRecord>>;

  /**
   * Fetches metadata for a collection (name, display_name).
   */
  getCollectionMetadata(
    collectionId: string,
  ): Promise<Result<{ name: string; display_name: string | null }>>;

  /**
   * Fetches the raw data of a record.
   */
  getRecordData(recordId: string): Promise<Result<{ id: string; data: Record<string, unknown> }>>;

  /**
   * Fetches all relation fields for a given collection.
   */
  getRelationFields(collectionId: string): Promise<Result<RawField[]>>;

  /**
   * Fetches all related record IDs for a specific field and source record.
   */
  getRelations(fieldId: string, sourceRecordId: string): Promise<Result<string[]>>;

  /**
   * Fetches all record IDs that point to this record via a specific field.
   */
  getReverseRelations(targetFieldId: string, sourceRecordId: string): Promise<Result<string[]>>;
}
