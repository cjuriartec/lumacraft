import { SupabaseClient } from "@supabase/supabase-js";

import {
  PersistedTemplateAIBlockCacheEntry,
  TemplateAIBlockCachePort,
} from "@/modules/template/application/ports/template-ai-block-cache.port";
import { isTemplateBlocks, TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

interface TemplateAIBlockCacheRow {
  cache_key: string;
  blocks: unknown;
  warnings: unknown;
  last_used_at: string | null;
}

const CACHE_RETENTION_DAYS = 7;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isFresh(lastUsedAt: string | null): boolean {
  if (!lastUsedAt) {
    return false;
  }

  const ageMs = Date.now() - new Date(lastUsedAt).getTime();
  return ageMs <= CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
}

export class SupabaseTemplateAIBlockCacheRepository
  extends BaseRepository
  implements TemplateAIBlockCachePort
{
  constructor(supabase: SupabaseClient) {
    super(supabase, "template_ai_block_cache");
  }

  public async findByKey(
    cacheKey: string,
  ): Promise<Result<PersistedTemplateAIBlockCacheEntry | null, DomainError>> {
    const { data, error } = await this.table.select("*").eq("cache_key", cacheKey).maybeSingle();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    if (!data) {
      return ok(null);
    }

    const row = data as TemplateAIBlockCacheRow;
    if (!isFresh(row.last_used_at)) {
      return ok(null);
    }

    if (!isTemplateBlocks(row.blocks) || !isStringArray(row.warnings)) {
      return fail(new DomainError("Invalid AI block cache payload", "DATA_INTEGRITY_ERROR"));
    }

    const touchResult = await this.touch(cacheKey);
    if (!touchResult.ok) {
      return fail(touchResult.error);
    }

    return ok({
      cacheKey: row.cache_key,
      blocks: row.blocks,
      warnings: row.warnings,
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    });
  }

  public async save(params: {
    cacheKey: string;
    accountId: string;
    providerId: string;
    model: string;
    blocks: TemplateBlocks;
    warnings: string[];
  }): Promise<Result<void, DomainError>> {
    const now = new Date().toISOString();
    const { error } = await this.table.upsert(
      {
        cache_key: params.cacheKey,
        account_id: params.accountId,
        provider_id: params.providerId,
        model: params.model,
        blocks: params.blocks,
        warnings: params.warnings,
        updated_at: now,
        last_used_at: now,
      },
      { onConflict: "cache_key" },
    );

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(undefined);
  }

  private async touch(cacheKey: string): Promise<Result<void, DomainError>> {
    const { error } = await this.table
      .update({
        last_used_at: new Date().toISOString(),
      })
      .eq("cache_key", cacheKey);

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return ok(undefined);
  }
}
