import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { DataRecord } from "../../domain/entities/record.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";
import { IRecordRepository } from "../../domain/ports/record-repository.port";
import { IRelationRepository } from "../../domain/ports/relation-repository.port";

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
    private readonly relationRepository: IRelationRepository,
  ) {}

  async execute(request: ResolveReverseLookupRequest): Promise<Result<ReverseLookupMap>> {
    const map: ReverseLookupMap = {};
    for (const sourceId of request.sourceRecordIds) {
      map[sourceId] = [];
    }

    if (request.sourceRecordIds.length === 0) {
      return ok(map);
    }

    // 1. Ensure the source relation field exists.
    const fieldRes = await this.fieldRepository.findById(request.targetFieldId);
    if (!fieldRes.ok || !fieldRes.value) {
      return fail(new DomainError(`Target field ${request.targetFieldId} not found`, "NOT_FOUND"));
    }

    // 2. Resolve canonical relation rows instead of relying on record.data serialization.
    const relationsRes = await this.relationRepository.listByFieldAndTargetRecordIds(
      request.targetFieldId,
      request.sourceRecordIds,
    );
    if (!relationsRes.ok) {
      return fail(relationsRes.error);
    }

    if (relationsRes.value.length === 0) {
      return ok(map);
    }

    const uniqueSourceRecordIds = [
      ...new Set(relationsRes.value.map((relation) => relation.sourceRecordId)),
    ];
    const recordsRes = await this.recordRepository.findByCollectionId(request.targetCollectionId, {
      page: 1,
      pageSize: Math.max(uniqueSourceRecordIds.length, 1),
      sortField: "created_at",
      sortDirection: "desc",
      search: "",
      searchFields: [],
      filters: [{ field: "id", operator: "in", value: uniqueSourceRecordIds }],
    });
    if (!recordsRes.ok) {
      return fail(recordsRes.error);
    }

    const recordsById = new Map<string, DataRecord>(
      recordsRes.value.data.map((record) => [record.id, record]),
    );

    // 3. Group source records by the record currently being inspected in the reverse field.
    for (const relation of relationsRes.value) {
      const record = recordsById.get(relation.sourceRecordId);
      if (record && map[relation.targetRecordId]) {
        map[relation.targetRecordId].push(record);
      }
    }

    return ok(map);
  }
}
