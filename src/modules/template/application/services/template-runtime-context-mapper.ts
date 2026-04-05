import { EagerLoadedRecord } from "@/modules/collection/domain/types/eager-loading.types";

export function mapEagerRecordToTemplateRoot(record: EagerLoadedRecord): Record<string, unknown> {
  const baseData: Record<string, unknown> = { ...record.data };

  for (const [fieldName, relationValue] of Object.entries(record.relations)) {
    if (Array.isArray(relationValue)) {
      baseData[fieldName] = relationValue.map(mapEagerRecordToTemplateRoot);
      continue;
    }

    if (relationValue && typeof relationValue === "object") {
      baseData[fieldName] = mapEagerRecordToTemplateRoot(relationValue);
      continue;
    }

    baseData[fieldName] = relationValue;
  }

  return baseData;
}
