import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";

export class SupabaseTemplateRepository extends BaseRepository implements ITemplateRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, "templates");
  }

  public async findById(id: string): Promise<Result<Template | null>> {
    const { data, error } = await this.table.select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") return ok(null);
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(this.toEntity(data));
  }

  public async findByAccountId(accountId: string): Promise<Result<Template[]>> {
    const { data, error } = await this.table.select("*").eq("account_id", accountId);

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ok(data.map((item: Record<string, any>) => this.toEntity(item)));
  }

  public async create(template: Template): Promise<Result<Template>> {
    const { data, error } = await this.table
      .insert({
        id: template.id,
        account_id: template.accountId,
        name: template.name,
        description: template.description,
        collection_id: template.collectionId,
        blocks: template.blocks,
        version: template.version,
        created_by: template.createdBy,
      })
      .select()
      .single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(this.toEntity(data));
  }

  public async update(template: Template): Promise<Result<Template>> {
    const { data, error } = await this.table
      .update({
        name: template.name,
        description: template.description,
        collection_id: template.collectionId,
        blocks: template.blocks,
        version: template.version,
        updated_at: new Date().toISOString(),
      })
      .eq("id", template.id)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toEntity(data: Record<string, any>): Template {
    const result = Template.create({
      id: data.id,
      accountId: data.account_id,
      name: data.name,
      description: data.description || undefined,
      collectionId: data.collection_id || undefined,
      blocks: data.blocks || [],
      version: data.version,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    });

    if (!result.ok) {
      throw new DomainError(
        `Failed to hydrate Template entity: ${result.error.message}`,
        "DATA_INTEGRITY_ERROR",
      );
    }

    return result.value;
  }
}
