import { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { IStorageRepository } from "../../domain/ports/storage-repository.port";

export class SupabaseStorageRepository implements IStorageRepository {
  constructor(private supabase: SupabaseClient) {}

  public async upload(bucket: string, path: string, file: File): Promise<Result<{ path: string }>> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (error) return fail(new DomainError(error.message, "STORAGE_ERROR"));
    return ok({ path: data.path });
  }

  public async download(bucket: string, path: string): Promise<Result<Blob>> {
    const { data, error } = await this.supabase.storage.from(bucket).download(path);

    if (error) return fail(new DomainError(error.message, "STORAGE_ERROR"));
    if (!data) return fail(new DomainError("No data found for download", "NOT_FOUND"));

    return ok(data);
  }

  public getPublicUrl(bucket: string, path: string): Result<string> {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return ok(data.publicUrl);
  }

  public async delete(bucket: string, paths: string[]): Promise<Result<void>> {
    const { error } = await this.supabase.storage.from(bucket).remove(paths);

    if (error) return fail(new DomainError(error.message, "STORAGE_ERROR"));
    return ok(undefined);
  }
}
