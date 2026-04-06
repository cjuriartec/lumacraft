import { Result } from "@/shared/domain/result";

import {
  RecordRelation,
  SyncFieldRelationsRequest,
  ValidateCardinalityRequest,
} from "../types/relation.types";

export interface IRelationRepository {
  listBySourceRecord(sourceRecordId: string): Promise<Result<RecordRelation[]>>;
  validateCardinality(request: ValidateCardinalityRequest): Promise<Result<void>>;
  syncFieldRelationsForSource(request: SyncFieldRelationsRequest): Promise<Result<void>>;
}
