import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { DataRecord } from "../../domain/entities/record.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";
import { IRecordRepository } from "../../domain/ports/record-repository.port";

export interface ResolveReverseLookupRequest {
  targetFieldId: string;
  targetCollectionId: string;
  sourceRecordIds: string[];
}

export type ReverseLookupMap = Record<string, DataRecord[]>;

export class ResolveReverseLookupUseCase {
  constructor(
    private readonly fieldRepository: IFieldRepository,
    private readonly recordRepository: IRecordRepository,
  ) {}

  async execute(request: ResolveReverseLookupRequest): Promise<Result<ReverseLookupMap>> {
    // 1. Get the target field to know its name (JSONB key)
    const fieldRes = await this.fieldRepository.findById(request.targetFieldId);
    if (!fieldRes.ok || !fieldRes.value) {
      return fail(new DomainError(`Target field ${request.targetFieldId} not found`, "NOT_FOUND"));
    }

    const targetField = fieldRes.value;
    const targetFieldName = targetField.name;

    // 2. Query target records in bulk
    const recordsRes = await this.recordRepository.findByFieldValue(
      request.targetCollectionId,
      targetFieldName,
      request.sourceRecordIds,
    );

    if (!recordsRes.ok) return fail(recordsRes.error);

    // 3. Group records by source ID
    const map: ReverseLookupMap = {};
    for (const sourceId of request.sourceRecordIds) {
      map[sourceId] = [];
    }

    for (const record of recordsRes.value) {
      // The link value is in record.data[targetFieldName]
      const linkValue = record.data[targetFieldName];

      if (Array.isArray(linkValue)) {
        for (const id of linkValue) {
          if (map[String(id)]) {
            map[String(id)].push(record);
          }
        }
      } else if (linkValue && map[String(linkValue)]) {
        map[String(linkValue)].push(record);
      }
    }

    return ok(map);
  }
}
