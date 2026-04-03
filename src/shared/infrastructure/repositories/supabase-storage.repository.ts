import type { SupabaseClient } from "@supabase/supabase-js";

import type { IStorageRepository } from "@/shared/domain/ports/storage-repository.port";
import { DomainError, fail, ok, type Result } from "@/shared/domain/result";

/**
 * Infrastructure Adapter: Supabase Storage Repository
 *
 * Implements IStorageRepository using Supabase Storage API.
 * Handles upload and public URL retrieval, mapping Supabase
 * errors to the domain's DomainError type.
 */
export class SupabaseStorageRepository implements IStorageRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async upload(bucket: string, path: string, file: File): Promise<Result<{ url: string }>> {
    const { error } = await this.supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      return fail(new DomainError(error.message, "STORAGE_UPLOAD_ERROR"));
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage.from(bucket).getPublicUrl(path);

    return ok({ url: publicUrl });
  }
}
