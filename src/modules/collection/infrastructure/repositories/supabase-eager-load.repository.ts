import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { IEagerLoadRepository, RawField } from "../../domain/ports/eager-load-repository.port";
import { EagerLoadedRecord } from "../../domain/types/eager-loading.types";

type CollectionMetadata = { name: string; display_name: string | null };
type RecordPayload = { id: string; data: Record<string, unknown> };

function buildRelationPath(prefix: string | undefined, fieldName: string): string {
  return prefix ? `${prefix}.${fieldName}` : fieldName;
}

function shouldIncludeRelationPath(fieldPath: string, includeRelationPaths?: string[]): boolean {
  if (!includeRelationPaths || includeRelationPaths.length === 0) {
    return true;
  }

  return includeRelationPaths.some(
    (path) => path === fieldPath || path.startsWith(`${fieldPath}.`),
  );
}

function mapReverseRelationType(originalRelationType?: string): string {
  if (originalRelationType === "ONE_TO_ONE") {
    return "ONE_TO_ONE";
  }

  if (originalRelationType === "ONE_TO_MANY") {
    return "MANY_TO_ONE";
  }

  if (originalRelationType === "MANY_TO_ONE") {
    return "ONE_TO_MANY";
  }

  return "MANY_TO_MANY";
}

export class SupabaseEagerLoadRepository extends BaseRepository implements IEagerLoadRepository {
  private readonly collectionMetadataCache = new Map<string, Promise<Result<CollectionMetadata>>>();
  private readonly recordDataCache = new Map<string, Promise<Result<RecordPayload>>>();
  private readonly relationFieldsCache = new Map<string, Promise<Result<RawField[]>>>();
  private readonly fieldDefinitionCache = new Map<string, Promise<Result<RawField | null>>>();
  private readonly relationsCache = new Map<string, Promise<Result<string[]>>>();
  private readonly reverseRelationsCache = new Map<string, Promise<Result<string[]>>>();

  constructor(supabase: SupabaseClient) {
    super(supabase, "records");
  }

  private async getOrLoad<TValue>(
    cache: Map<string, Promise<Result<TValue>>>,
    key: string,
    loader: () => Promise<Result<TValue>>,
  ): Promise<Result<TValue>> {
    let pending = cache.get(key);

    if (!pending) {
      pending = loader();
      cache.set(key, pending);
    }

    const result = await pending;
    if (!result.ok) {
      cache.delete(key);
    }

    return result;
  }

  private async getFieldDefinition(fieldId: string): Promise<Result<RawField | null>> {
    return this.getOrLoad(this.fieldDefinitionCache, fieldId, async () => {
      const { data, error } = await this.supabase
        .from("fields")
        .select("id, name, field_type, config")
        .eq("id", fieldId)
        .maybeSingle();

      if (error) {
        return fail(new DomainError(error.message, "DB_ERROR"));
      }

      return ok((data as RawField | null) ?? null);
    });
  }

  async getCollectionMetadata(
    collectionId: string,
  ): Promise<Result<{ name: string; display_name: string | null }>> {
    return this.getOrLoad(this.collectionMetadataCache, collectionId, async () => {
      const { data, error } = await this.supabase
        .from("collections")
        .select("name, display_name")
        .eq("id", collectionId)
        .single();

      if (error || !data) {
        return fail(new DomainError(`Collection ${collectionId} not found`, "NOT_FOUND"));
      }

      return ok({ name: data.name, display_name: data.display_name });
    });
  }

  async getRecordData(
    recordId: string,
  ): Promise<Result<{ id: string; data: Record<string, unknown> }>> {
    return this.getOrLoad(this.recordDataCache, recordId, async () => {
      const { data, error } = await this.table.select("id, data").eq("id", recordId).single();
      if (error || !data) {
        return fail(new DomainError(`Record ${recordId} not found`, "NOT_FOUND"));
      }

      return ok({ id: data.id, data: data.data });
    });
  }

  async getRelationFields(collectionId: string): Promise<Result<RawField[]>> {
    return this.getOrLoad(this.relationFieldsCache, collectionId, async () => {
      const { data, error } = await this.supabase
        .from("fields")
        .select("id, name, field_type, config")
        .eq("collection_id", collectionId)
        .in("field_type", ["RELATION", "REVERSE_LOOKUP"]);

      if (error) return fail(new DomainError(error.message, "DB_ERROR"));
      return ok((data as RawField[]) || []);
    });
  }

  async getRelations(fieldId: string, sourceRecordId: string): Promise<Result<string[]>> {
    const cacheKey = `${fieldId}:${sourceRecordId}`;
    return this.getOrLoad(this.relationsCache, cacheKey, async () => {
      const { data, error } = await this.supabase
        .from("record_relations")
        .select("target_record_id")
        .eq("field_id", fieldId)
        .eq("source_record_id", sourceRecordId);

      if (error) return fail(new DomainError(error.message, "DB_ERROR"));
      return ok((data || []).map((relation) => relation.target_record_id as string));
    });
  }

  async getReverseRelations(
    targetFieldId: string,
    sourceRecordId: string,
  ): Promise<Result<string[]>> {
    const cacheKey = `${targetFieldId}:${sourceRecordId}`;
    return this.getOrLoad(this.reverseRelationsCache, cacheKey, async () => {
      const { data, error } = await this.supabase
        .from("record_relations")
        .select("source_record_id")
        .eq("field_id", targetFieldId)
        .eq("target_record_id", sourceRecordId);

      if (error) return fail(new DomainError(error.message, "DB_ERROR"));
      return ok((data || []).map((relation) => relation.source_record_id as string));
    });
  }

  async resolveRecursive(
    recordId: string,
    collectionId: string,
    depth: number,
    visited: Set<string>,
    includeFields?: string[],
    includeRelationPaths?: string[],
    currentPathPrefix = "",
  ): Promise<Result<EagerLoadedRecord>> {
    if (visited.has(recordId)) {
      const [metaResult, recordResult] = await Promise.all([
        this.getCollectionMetadata(collectionId),
        this.getRecordData(recordId),
      ]);

      if (!metaResult.ok || !recordResult.ok) {
        return fail(
          new DomainError(
            `Circular reference detected for record ${recordId}`,
            "CIRCULAR_REFERENCE",
          ),
        );
      }

      const shallowResult: EagerLoadedRecord = {
        id: recordResult.value.id,
        collectionId,
        collectionName: metaResult.value.display_name || metaResult.value.name,
        data: recordResult.value.data || {},
        relations: {},
      };

      const fieldsResult = await this.getRelationFields(collectionId);
      if (!fieldsResult.ok) {
        return ok(shallowResult);
      }

      const newVisitedForShallow = new Set(visited);
      newVisitedForShallow.add(recordId);
      const relationFields = fieldsResult.value.filter((field) => {
        if (field.field_type !== "RELATION") {
          return false;
        }

        if (!currentPathPrefix && includeFields && !includeFields.includes(field.name)) {
          return false;
        }

        return shouldIncludeRelationPath(
          buildRelationPath(currentPathPrefix, field.name),
          includeRelationPaths,
        );
      });

      const resolvedRelations = await Promise.all(
        relationFields.map(async (field) => {
          const config = (field.config as Record<string, unknown>) || {};
          const targetCollectionId = config.targetCollectionId as string;
          if (!targetCollectionId) {
            return null;
          }

          const targetIds = extractRelationIds(shallowResult.data[field.name]);
          if (targetIds.length === 0) {
            return null;
          }

          const resolvedRecords = (
            await Promise.all(
              targetIds.map(async (targetId) => {
                const resolved = await this.resolveRecursive(
                  targetId,
                  targetCollectionId,
                  0,
                  newVisitedForShallow,
                  undefined,
                  includeRelationPaths,
                  buildRelationPath(currentPathPrefix, field.name),
                );

                return resolved.ok ? resolved.value : null;
              }),
            )
          ).filter((record): record is EagerLoadedRecord => record !== null);

          if (resolvedRecords.length === 0) {
            return null;
          }

          const relationType = config.relationType as string;
          return {
            fieldName: field.name,
            isSingular: relationType === "ONE_TO_ONE" || relationType === "MANY_TO_ONE",
            resolvedRecords,
          };
        }),
      );

      for (const relation of resolvedRelations) {
        if (!relation) {
          continue;
        }

        shallowResult.relations[relation.fieldName] = relation.isSingular
          ? relation.resolvedRecords[0]
          : relation.resolvedRecords;
      }

      return ok(shallowResult);
    }

    const newVisited = new Set(visited);
    newVisited.add(recordId);

    const [metaResult, recordResult] = await Promise.all([
      this.getCollectionMetadata(collectionId),
      this.getRecordData(recordId),
    ]);

    if (!metaResult.ok) return fail(metaResult.error);
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
    if (!fieldsResult.ok) return ok(result);

    const relationFields = fieldsResult.value.filter((field) => {
      if (!currentPathPrefix && includeFields && !includeFields.includes(field.name)) {
        return false;
      }

      return shouldIncludeRelationPath(
        buildRelationPath(currentPathPrefix, field.name),
        includeRelationPaths,
      );
    });

    const resolvedRelations = await Promise.all(
      relationFields.map(async (field) => {
        const config = (field.config as Record<string, unknown>) || {};
        const targetCollectionId = config.targetCollectionId as string;
        if (!targetCollectionId) {
          return null;
        }

        const fieldPath = buildRelationPath(currentPathPrefix, field.name);
        let currentRelationType = config.relationType as string;
        let relatedRecordIds: string[] = [];

        if (field.field_type === "REVERSE_LOOKUP") {
          const targetFieldId = config.targetFieldId as string;
          if (!targetFieldId) {
            return null;
          }

          const targetFieldResult = await this.getFieldDefinition(targetFieldId);
          if (!targetFieldResult.ok || !targetFieldResult.value) {
            return null;
          }

          const targetConfig = (targetFieldResult.value.config as Record<string, unknown>) || {};
          currentRelationType = mapReverseRelationType(targetConfig.relationType as string);

          const reverseRelationsResult = await this.getReverseRelations(targetFieldId, recordId);
          if (!reverseRelationsResult.ok || reverseRelationsResult.value.length === 0) {
            return null;
          }

          relatedRecordIds = reverseRelationsResult.value;
        } else {
          relatedRecordIds = extractRelationIds(result.data[field.name]);
          if (relatedRecordIds.length === 0) {
            return null;
          }
        }

        const resolvedRecords = (
          await Promise.all(
            relatedRecordIds.map(async (targetId) => {
              const resolved = await this.resolveRecursive(
                targetId,
                targetCollectionId,
                depth - 1,
                newVisited,
                undefined,
                includeRelationPaths,
                fieldPath,
              );

              return resolved.ok ? resolved.value : null;
            }),
          )
        ).filter((record): record is EagerLoadedRecord => record !== null);

        if (resolvedRecords.length === 0) {
          return null;
        }

        return {
          fieldName: field.name,
          isSingular: currentRelationType === "ONE_TO_ONE" || currentRelationType === "MANY_TO_ONE",
          resolvedRecords,
        };
      }),
    );

    for (const relation of resolvedRelations) {
      if (!relation) {
        continue;
      }

      result.relations[relation.fieldName] = relation.isSingular
        ? relation.resolvedRecords[0]
        : relation.resolvedRecords;
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
