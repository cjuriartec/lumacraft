import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository, TemplateHeader } from "../../domain/ports/template-repository.port";
import { isTemplateBlocks, TemplateBlocks } from "../../domain/types/template-blocks";

interface TemplateRow {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  collection_id: string | null;
  blocks: unknown;
  version: number | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface TemplateInsertRow {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  collection_id: string | null;
  blocks: TemplateBlocks;
  version: number;
  created_by: string | null;
}

interface TemplateUpdateRow {
  name: string;
  description: string | null;
  collection_id: string | null;
  blocks: TemplateBlocks;
  version: number;
  updated_at: string;
}

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

    return this.toEntityResult(data as TemplateRow);
  }

  public async findHeaderById(id: string): Promise<Result<TemplateHeader | null>> {
    const { data, error } = await this.table
      .select("id, account_id, collection_id, version")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    if (!data) {
      return ok(null);
    }

    return ok({
      id: data.id,
      accountId: data.account_id,
      collectionId: data.collection_id ?? null,
      version: data.version ?? 1,
    });
  }

  public async findByAccountId(accountId: string): Promise<Result<Template[]>> {
    const { data, error } = await this.table.select("*").eq("account_id", accountId);

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    const templates: Template[] = [];

    for (const item of (data ?? []) as TemplateRow[]) {
      const entityRes = this.toEntityResult(item);
      if (!entityRes.ok) return fail(entityRes.error);
      templates.push(entityRes.value);
    }

    return ok(templates);
  }

  public async create(template: Template): Promise<Result<Template>> {
    const { data, error } = await this.table.insert(this.toInsertRow(template)).select().single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return this.toEntityResult(data as TemplateRow);
  }

  public async update(template: Template, expectedVersion: number): Promise<Result<Template>> {
    const { data, error } = await this.table
      .update(this.toUpdateRow(template))
      .eq("id", template.id)
      .eq("account_id", template.accountId)
      .eq("version", expectedVersion)
      .select()
      .maybeSingle();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    if (!data) {
      return fail(new DomainError("Template version conflict", "TEMPLATE_VERSION_CONFLICT"));
    }

    return this.toEntityResult(data as TemplateRow);
  }

  public async delete(id: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq("id", id);

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(undefined);
  }

  public async count(accountId: string): Promise<Result<number>> {
    const { count, error } = await this.table
      .select("*", { count: "exact", head: true })
      .eq("account_id", accountId);

    if (error) return fail(new DomainError(error.message, "DB_ERROR"));
    return ok(count || 0);
  }

  private toEntityResult(data: TemplateRow): Result<Template> {
    if (!isTemplateBlocks(data.blocks)) {
      return fail(new DomainError("Invalid template blocks payload", "DATA_INTEGRITY_ERROR"));
    }

    const result = Template.create({
      id: data.id,
      accountId: data.account_id,
      name: data.name,
      description: data.description ?? undefined,
      collectionId: data.collection_id ?? null,
      blocks: data.blocks,
      version: data.version ?? 1,
      createdBy: data.created_by ?? undefined,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    });

    if (!result.ok) {
      return fail(
        new DomainError(
          `Failed to hydrate Template entity: ${result.error.message}`,
          "DATA_INTEGRITY_ERROR",
        ),
      );
    }

    return ok(result.value);
  }

  private toInsertRow(template: Template): TemplateInsertRow {
    return {
      id: template.id,
      account_id: template.accountId,
      name: template.name,
      description: template.description ?? null,
      collection_id: template.collectionId ?? null,
      blocks: template.blocks,
      version: template.version,
      created_by: template.createdBy ?? null,
    };
  }

  private toUpdateRow(template: Template): TemplateUpdateRow {
    return {
      name: template.name,
      description: template.description ?? null,
      collection_id: template.collectionId ?? null,
      blocks: template.blocks,
      version: template.version,
      updated_at: new Date().toISOString(),
    };
  }
}
