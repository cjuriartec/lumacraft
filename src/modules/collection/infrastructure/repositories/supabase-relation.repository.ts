import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { IRelationRepository } from "../../domain/ports/relation-repository.port";
import {
  RecordRelation,
  SyncFieldRelationsRequest,
  ValidateCardinalityRequest,
} from "../../domain/types/relation.types";

export class SupabaseRelationRepository extends BaseRepository implements IRelationRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "record_relations");
  }

  public async listBySourceRecord(sourceRecordId: string): Promise<Result<RecordRelation[]>> {
    const { data, error } = await this.table
      .select("*")
      .eq("source_record_id", sourceRecordId)
      .order("created_at", { ascending: true });

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));

    return ok((data as Record<string, unknown>[]).map((item) => this.toEntity(item)));
  }

  public async validateCardinality(request: ValidateCardinalityRequest): Promise<Result<void>> {
    const uniqueTargetIds = [...new Set(request.targetRecordIds)];

    if (request.relationType === "ONE_TO_ONE" && uniqueTargetIds.length > 1) {
      return fail(
        new DomainError(
          "ONE_TO_ONE relation cannot contain multiple target records",
          "RELATION_CARDINALITY_VIOLATION",
        ),
      );
    }

    if (
      (request.relationType === "ONE_TO_ONE" || request.relationType === "ONE_TO_MANY") &&
      uniqueTargetIds.length > 0
    ) {
      const { data, error } = await this.table
        .select("id")
        .eq("field_id", request.fieldId)
        .in("target_record_id", uniqueTargetIds)
        .neq("source_record_id", request.sourceRecordId)
        .limit(1);

      if (error) return fail(new DomainError(error.message, "DB_ERROR"));

      if (data && data.length > 0) {
        return fail(
          new DomainError(
            `Target record already linked for ${request.relationType}`,
            "RELATION_CARDINALITY_VIOLATION",
          ),
        );
      }
    }

    return ok(undefined);
  }

  public async syncFieldRelationsForSource(
    request: SyncFieldRelationsRequest,
  ): Promise<Result<void>> {
    const uniqueTargets = [...new Set(request.targetRecordIds)];
    const { data: existingRows, error: existingError } = await this.table
      .select("target_record_id")
      .eq("field_id", request.fieldId)
      .eq("source_record_id", request.sourceRecordId);

    if (existingError) return fail(new DomainError(existingError.message, "DB_ERROR"));

    const existing = (existingRows as Array<{ target_record_id: string }>).map(
      (row) => row.target_record_id,
    );
    const toDelete = existing.filter((targetId) => !uniqueTargets.includes(targetId));
    const toInsert = uniqueTargets.filter((targetId) => !existing.includes(targetId));

    if (toDelete.length > 0) {
      const { error } = await this.table
        .delete()
        .eq("field_id", request.fieldId)
        .eq("source_record_id", request.sourceRecordId)
        .in("target_record_id", toDelete);

      if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    }

    if (toInsert.length > 0) {
      const rows = toInsert.map((targetId) => ({
        id: crypto.randomUUID(),
        account_id: request.accountId,
        field_id: request.fieldId,
        source_record_id: request.sourceRecordId,
        target_record_id: targetId,
      }));

      const { error } = await this.table.insert(rows);
      if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(undefined);
  }

  private toEntity(data: Record<string, unknown>): RecordRelation {
    return {
      id: data.id as string,
      accountId: data.account_id as string,
      fieldId: data.field_id as string,
      sourceRecordId: data.source_record_id as string,
      targetRecordId: data.target_record_id as string,
      createdAt: new Date(data.created_at as string),
    };
  }
}
