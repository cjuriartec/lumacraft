import { Collection } from "../../domain/entities/collection.entity";
import { Field } from "../../domain/entities/field.entity";
import { resolveRecordLabel } from "../../domain/services/record-label.service";
import { EagerLoadedRecord } from "../../domain/types/eager-loading.types";

export interface RelatedRecordSummary {
  id: string;
  label: string;
  collectionId: string;
  collectionName: string;
}

export function getRelationTargetCollectionId(field: Field): string | undefined {
  const config =
    (field.config?.value as
      | {
          targetCollectionId?: string;
        }
      | undefined) ?? {};

  return config.targetCollectionId;
}

export function toRelatedRecordSummaries(
  value: EagerLoadedRecord | EagerLoadedRecord[] | undefined,
  collections: Collection[],
): RelatedRecordSummary[] {
  const records = Array.isArray(value) ? value : value ? [value] : [];

  return records.map((record) => {
    const collection = collections.find((item) => item.id === record.collectionId);

    return {
      id: record.id,
      label: resolveRecordLabel(record, collection?.primaryFieldName),
      collectionId: record.collectionId,
      collectionName: record.collectionName,
    };
  });
}
