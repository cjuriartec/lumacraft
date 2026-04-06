import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { Collection } from "../../domain/entities/collection.entity";
import { ICollectionRepository } from "../../domain/ports/collection-repository.port";

export class SupabaseCollectionRepository extends BaseRepository implements ICollectionRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "collections");
  }

  public async findById(id: string): Promise<Result<Collection | null>> {
    const { data, error } = await this.table.select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return ok(null);
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(this.toEntity(data));
  }

  public async findByAccountId(accountId: string): Promise<Result<Collection[]>> {
    const { data, error } = await this.table.select("*").eq("account_id", accountId);

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(data.map((item: Record<string, unknown>) => this.toEntity(item)));
  }

  public async create(collection: Collection): Promise<Result<Collection>> {
    const { data, error } = await this.table
      .insert({
        id: collection.id,
        account_id: collection.accountId,
        name: collection.name,
        display_name: collection.displayName,
        description: collection.description,
        icon: collection.icon,
        primary_field_name: collection.primaryFieldName,
      })
      .select()
      .single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(this.toEntity(data));
  }

  public async update(collection: Collection): Promise<Result<Collection>> {
    const { data, error } = await this.table
      .update({
        name: collection.name,
        display_name: collection.displayName,
        description: collection.description,
        icon: collection.icon,
        primary_field_name: collection.primaryFieldName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collection.id)
      .select()
      .single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(this.toEntity(data));
  }

  public async delete(id: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq("id", id);

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(undefined);
  }

  private toEntity(data: Record<string, unknown>): Collection {
    const result = Collection.create({
      id: data.id as string,
      accountId: data.account_id as string,
      name: data.name as string,
      displayName: (data.display_name as string) || undefined,
      description: (data.description as string) || undefined,
      icon: (data.icon as string) || undefined,
      primaryFieldName: (data.primary_field_name as string) || null,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    });

    if (!result.ok) {
      throw new DomainError(
        `Failed to hydrate Collection entity from database: ${result.error.message}`,
        "DATA_INTEGRITY_ERROR",
      );
    }

    return result.value;
  }
}
