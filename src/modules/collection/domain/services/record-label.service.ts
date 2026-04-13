import { Collection } from "../entities/collection.entity";
import { DataRecord } from "../entities/record.entity";

type RecordLike = {
  id: string;
  data: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function formatShortRecordId(recordId: string): string {
  return recordId.slice(0, 8);
}

export function toRecordLabelValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value.map(toRecordLabelValue).filter((part) => part.length > 0);
    return parts.join(", ");
  }

  if (isPlainObject(value)) {
    const candidates = [value.displayName, value.name, value.label];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
  }

  return "";
}

export function resolveRecordLabel(record: RecordLike, primaryFieldName?: string | null): string {
  if (primaryFieldName) {
    const label = toRecordLabelValue(record.data[primaryFieldName]);
    if (label.length > 0) {
      return label;
    }
  }

  return formatShortRecordId(record.id);
}

export function resolveCollectionRecordLabel(record: DataRecord, collection: Collection): string {
  return resolveRecordLabel(record, collection.primaryFieldName);
}
