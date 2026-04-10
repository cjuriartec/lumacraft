import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { IEagerLoadRepository, RawField } from "../../domain/ports/eager-load-repository.port";
import { EagerLoadedRecord } from "../../domain/types/eager-loading.types";

export class SupabaseEagerLoadRepository extends BaseRepository implements IEagerLoadRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "records"); // Use records as the base table
  }

  async getCollectionMetadata(
    collectionId: string,
  ): Promise<Result<{ name: string; display_name: string | null }>> {
    const { data, error } = await this.supabase
      .from("collections")
      .select("name, display_name")
      .eq("id", collectionId)
      .single();

    if (error || !data)
      return fail(new DomainError(`Collection ${collectionId} not found`, "NOT_FOUND"));
    return ok({ name: data.name, display_name: data.display_name });
  }

  async getRecordData(
    recordId: string,
  ): Promise<Result<{ id: string; data: Record<string, unknown> }>> {
    const { data, error } = await this.table.select("id, data").eq("id", recordId).single();
    if (error || !data) return fail(new DomainError(`Record ${recordId} not found`, "NOT_FOUND"));
    return ok({ id: data.id, data: data.data });
  }

  async getRelationFields(collectionId: string): Promise<Result<RawField[]>> {
    const { data, error } = await this.supabase
      .from("fields")
      .select("id, name, field_type, config")
      .eq("collection_id", collectionId)
      .in("field_type", ["RELATION", "REVERSE_LOOKUP"]);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok((data as RawField[]) || []);
  }

  async getRelations(fieldId: string, sourceRecordId: string): Promise<Result<string[]>> {
    const { data, error } = await this.supabase
      .from("record_relations")
      .select("target_record_id")
      .eq("field_id", fieldId)
      .eq("source_record_id", sourceRecordId);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok((data || []).map((r) => r.target_record_id as string));
  }

  async getReverseRelations(
    targetCollectionId: string,
    targetFieldName: string,
    sourceRecordId: string,
  ): Promise<Result<string[]>> {
    const { data, error } = await this.supabase.rpc("resolve_reverse_lookup", {
      target_collection_id: targetCollectionId,
      target_field_name: targetFieldName,
      source_record_id: sourceRecordId,
    });

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    const records = (data as { id: string }[] | null) || [];
    return ok(records.map((r) => r.id));
  }

  async resolveRecursive(
    recordId: string,
    collectionId: string,
    depth: number,
    visited: Set<string>,
    includeFields?: string[],
  ): Promise<Result<EagerLoadedRecord>> {
    // Note: The recursive logic will be orchestrated by the Use Case to keep it mockable,
    // but the actual fetching logic is here.
    // However, to satisfy the interface, we'll implement it here and let the Use Case call it.

    if (visited.has(recordId)) {
      return fail(
        new DomainError(`Circular reference detected for record ${recordId}`, "CIRCULAR_REFERENCE"),
      );
    }
    const newVisited = new Set(visited);
    newVisited.add(recordId);

    const metaResult = await this.getCollectionMetadata(collectionId);
    if (!metaResult.ok) return fail(metaResult.error);

    const recordResult = await this.getRecordData(recordId);
    if (!recordResult.ok) return fail(recordResult.error);

    const result: EagerLoadedRecord = {
      id: recordResult.value.id,
      collectionId,
      collectionName: metaResult.value.display_name || metaResult.value.name,
      data: recordResult.value.data || {},
      relations: {},
    };

    if (depth <= 0) return ok(result);

    const fieldsResult = await this.getRelationFields(collectionId);
    if (!fieldsResult.ok) return ok(result); // No relations to load
    const fields = fieldsResult.value;

    for (const field of fields) {
      if (includeFields && !includeFields.includes(field.name)) continue;

      const config = (field.config as Record<string, unknown>) || {};
      const targetCollectionId = config.targetCollectionId as string;
      const relationType = config.relationType as string;

      if (!targetCollectionId) continue;

      let relationsResult: Result<string[]>;
      let currentRelationType = relationType;

      if (field.field_type === "REVERSE_LOOKUP") {
        const targetFieldId = config.targetFieldId as string;
        // We need the target field name to query the JSONB column via RPC
        const targetFieldRes = await this.supabase
          .from("fields")
          .select("name, config")
          .eq("id", targetFieldId)
          .single();

        if (targetFieldRes.error || !targetFieldRes.data) continue;

        const targetFieldName = targetFieldRes.data.name;
        const targetConfig = (targetFieldRes.data.config as Record<string, unknown>) || {};
        const originalRelationType = targetConfig.relationType as string;

        // Correct reverse mapping:
        // ONE_TO_ONE <-> ONE_TO_ONE (Both Singular)
        // MANY_TO_ONE <-> ONE_TO_MANY (Singular <-> Plural)
        // ONE_TO_MANY <-> MANY_TO_ONE (Plural <-> Singular)
        // MANY_TO_MANY <-> MANY_TO_MANY (Both Plural)
        if (originalRelationType === "ONE_TO_ONE") {
          currentRelationType = "ONE_TO_ONE";
        } else if (originalRelationType === "ONE_TO_MANY") {
          currentRelationType = "MANY_TO_ONE";
        } else if (originalRelationType === "MANY_TO_ONE") {
          currentRelationType = "ONE_TO_MANY";
        } else {
          currentRelationType = "MANY_TO_MANY";
        }

        relationsResult = await this.getReverseRelations(
          targetCollectionId,
          targetFieldName,
          recordId,
        );
      } else {
        const rawValue = result.data[field.name];
        const targetIds = extractRelationIds(rawValue);
        relationsResult = ok(targetIds);
      }

      if (!relationsResult.ok || relationsResult.value.length === 0) continue;

      const resolvedRecords: EagerLoadedRecord[] = [];
      for (const targetId of relationsResult.value) {
        if (newVisited.has(targetId)) continue;

        const resolved = await this.resolveRecursive(
          targetId,
          targetCollectionId,
          depth - 1,
          newVisited,
          undefined,
        );

        if (resolved.ok) {
          resolvedRecords.push(resolved.value);
        }
      }

      if (resolvedRecords.length > 0) {
        const isSingular =
          currentRelationType === "ONE_TO_ONE" || currentRelationType === "MANY_TO_ONE";
        result.relations[field.name] = isSingular ? resolvedRecords[0] : resolvedRecords;
      }
    }

    return ok(result);
  }
}

function extractRelationIds(value: unknown): string[] {
  if (value === undefined || value === null || value === "") return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}
