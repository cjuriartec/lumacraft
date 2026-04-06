import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { Field } from "../../domain/entities/field.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";
import { FieldConfig } from "../../domain/value-objects/field-config.vo";
import { FieldType } from "../../domain/value-objects/field-type.vo";

export class SupabaseFieldRepository extends BaseRepository implements IFieldRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "fields");
  }

  public async findByCollectionId(collectionId: string): Promise<Result<Field[]>> {
    const { data, error } = await this.table
      .select("*")
      .eq("collection_id", collectionId)
      .order("sort_order", { ascending: true });

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));

    const entities: Field[] = [];
    for (const item of data as Record<string, unknown>[]) {
      const entityRes = this.toEntity(item);
      if (!entityRes.ok) return fail(entityRes.error);
      entities.push(entityRes.value);
    }

    return ok(entities);
  }

  public async findById(id: string): Promise<Result<Field | null>> {
    const { data, error } = await this.table.select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return ok(null);
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    const entityRes = this.toEntity(data as Record<string, unknown>);
    if (!entityRes.ok) return fail(entityRes.error);

    return ok(entityRes.value);
  }

  public async create(field: Field): Promise<Result<Field>> {
    const persistence = this.toPersistence(field);
    const { data, error } = await this.table.insert(persistence).select().single();

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));

    const entityRes = this.toEntity(data as Record<string, unknown>);
    if (!entityRes.ok) return fail(entityRes.error);

    return ok(entityRes.value);
  }

  public async update(field: Field): Promise<Result<Field>> {
    const persistence = this.toPersistence(field);
    const { data, error } = await this.table
      .update(persistence)
      .eq("id", field.id)
      .select()
      .single();

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));

    const entityRes = this.toEntity(data as Record<string, unknown>);
    if (!entityRes.ok) return fail(entityRes.error);

    return ok(entityRes.value);
  }

  public async delete(id: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq("id", id);
    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(undefined);
  }

  public async reorder(collectionId: string, fieldIds: string[]): Promise<Result<void>> {
    const updates = fieldIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    // Basic implementation with loop for now. Consider server function for batch updates if list is large.
    for (const update of updates) {
      const { error } = await this.table
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
      if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(undefined);
  }

  private toEntity(data: Record<string, unknown>): Result<Field> {
    const fieldTypeRes = FieldType.create(data.field_type as string);
    if (!fieldTypeRes.ok) {
      return fail(
        new DomainError(`Invalid field type in DB: ${data.field_type}`, "DATA_INTEGRITY_ERROR"),
      );
    }

    const fieldConfig = FieldConfig.create(
      fieldTypeRes.value.value,
      (data.config as Record<string, unknown>) || {},
    );
    if (!fieldConfig.ok) {
      return fail(
        new DomainError(
          `Invalid field config in DB for type ${fieldTypeRes.value.value}: ${fieldConfig.error.message}`,
          "DATA_INTEGRITY_ERROR",
        ),
      );
    }

    const result = Field.create({
      id: data.id as string,
      collectionId: data.collection_id as string,
      name: data.name as string,
      displayName: (data.display_name as string) || undefined,
      description: (data.description as string) || undefined,
      fieldType: fieldTypeRes.value,
      isRequired: data.is_required as boolean,
      isUnique: data.is_unique as boolean,
      defaultValue: (data.default_value as string) || undefined,
      config: fieldConfig.value,
      sortOrder: data.sort_order as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    });

    if (!result.ok) {
      return fail(
        new DomainError(
          `Failed to hydrate Field entity from database: ${result.error.message}`,
          "DATA_INTEGRITY_ERROR",
        ),
      );
    }

    return ok(result.value);
  }

  private toPersistence(field: Field) {
    const json = field.toJSON();
    return {
      id: json.id,
      collection_id: json.collectionId,
      name: json.name,
      display_name: json.displayName,
      description: json.description,
      field_type: json.fieldType,
      is_required: json.isRequired,
      is_unique: json.isUnique,
      default_value: json.defaultValue,
      config: json.config,
      sort_order: json.sortOrder,
      updated_at: new Date().toISOString(),
    };
  }
}
