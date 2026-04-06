import { DomainError, fail, Result } from "@/shared/domain/result";

import { Field } from "../../domain/entities/field.entity";
import { DataRecord } from "../../domain/entities/record.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";
import { IRecordRepository } from "../../domain/ports/record-repository.port";
import { IRelationRepository } from "../../domain/ports/relation-repository.port";
import { RelationTypeValue } from "../../domain/value-objects/field-config.vo";

interface CreateRecordRequest {
  collectionId: string;
  accountId: string;
  data: Record<string, unknown>;
  userId?: string;
}

export class CreateRecordUseCase {
  constructor(
    private readonly recordRepository: IRecordRepository,
    private readonly fieldRepository: IFieldRepository,
    private readonly relationRepository?: IRelationRepository,
  ) {}

  async execute(request: CreateRecordRequest): Promise<Result<DataRecord>> {
    // 1. Get collection schema (fields)
    const fieldsRes = await this.fieldRepository.findByCollectionId(request.collectionId);
    if (!fieldsRes.ok) return fail(fieldsRes.error);
    const fields = fieldsRes.value;

    // 2. Uniqueness check
    for (const field of fields) {
      if (field.isUnique) {
        const val = request.data[field.name];
        if (val !== undefined && val !== null && val !== "") {
          const existing = await this.recordRepository.findByFieldValue(
            request.collectionId,
            field.name,
            val,
          );
          if (existing.ok && existing.value.length > 0) {
            return fail(
              new DomainError(
                `El valor "${val}" para el campo "${field.displayName || field.name}" ya existe y debe ser único.`,
                "DUPLICATE_VALUE",
              ),
            );
          }
        }
      }
    }

    // 3. Create entity
    const record = new DataRecord({
      id: crypto.randomUUID(),
      collectionId: request.collectionId,
      accountId: request.accountId,
      data: request.data,
      createdBy: request.userId,
    });

    // 4. Validate against schema
    const validationRes = record.validateAgainstSchema(fields);
    if (!validationRes.ok) return fail(validationRes.error);

    // 5. Validate relation cardinality before persistence to avoid partial writes
    const relationValidationRes = await this.validateRelations(record, fields);
    if (!relationValidationRes.ok) return fail(relationValidationRes.error);

    // 6. Persistence
    const created = await this.recordRepository.create(record);
    if (!created.ok) return fail(created.error);

    // 7. Sync relation links for RELATION fields
    const syncRes = await this.syncRelations(created.value, fields, request.accountId);
    if (!syncRes.ok) return fail(syncRes.error);

    return created;
  }

  private async validateRelations(record: DataRecord, fields: Field[]): Promise<Result<void>> {
    if (!this.relationRepository) return { ok: true, value: undefined };

    for (const field of fields) {
      if (field.fieldType.value !== "RELATION") continue;

      const config =
        (field.config?.value as { relationType?: RelationTypeValue } | undefined) ?? {};
      if (!config.relationType) continue;

      const targetRecordIds = toRelationIds(record.data[field.name]);
      const cardinality = await this.relationRepository.validateCardinality({
        fieldId: field.id,
        sourceRecordId: record.id,
        relationType: config.relationType,
        targetRecordIds,
      });
      if (!cardinality.ok) return fail(cardinality.error);
    }

    return { ok: true, value: undefined };
  }

  private async syncRelations(
    record: DataRecord,
    fields: Field[],
    accountId: string,
  ): Promise<Result<void>> {
    if (!this.relationRepository) return { ok: true, value: undefined };

    for (const field of fields) {
      if (field.fieldType.value !== "RELATION") continue;

      const config =
        (field.config?.value as { relationType?: RelationTypeValue } | undefined) ?? {};
      if (!config.relationType) continue;

      const targetRecordIds = toRelationIds(record.data[field.name]);

      const sync = await this.relationRepository.syncFieldRelationsForSource({
        accountId,
        fieldId: field.id,
        sourceRecordId: record.id,
        targetRecordIds,
      });
      if (!sync.ok) return fail(sync.error);
    }

    return { ok: true, value: undefined };
  }
}

function toRelationIds(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .filter((item, index, arr) => arr.indexOf(item) === index);
  }

  if (typeof value === "string") {
    return [value];
  }

  return [];
}
