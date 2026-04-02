import { RelationTypeValue } from "../value-objects/field-config.vo";

export interface RecordRelation {
  id: string;
  accountId: string;
  fieldId: string;
  sourceRecordId: string;
  targetRecordId: string;
  createdAt: Date;
}

export interface ValidateCardinalityRequest {
  fieldId: string;
  sourceRecordId: string;
  targetRecordIds: string[];
  relationType: RelationTypeValue;
}

export interface SyncFieldRelationsRequest {
  accountId: string;
  fieldId: string;
  sourceRecordId: string;
  targetRecordIds: string[];
}
