import { SupabaseClient } from '@supabase/supabase-js'
import { IStorageRepository } from '../../domain/ports/storage-repository.port'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'

export class SupabaseStorageRepository implements IStorageRepository {
  constructor(private supabase: SupabaseClient) {}

  public async upload(bucket: string, path: string, file: File): Promise<Result<{ path: string }>> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) return fail(new DomainError(error.message, 'STORAGE_ERROR'))
    return ok({ path: data.path })
  }

  public async download(bucket: string, path: string): Promise<Result<Blob>> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path)

    if (error) return fail(new DomainError(error.message, 'STORAGE_ERROR'))
    if (!data) return fail(new DomainError('No data found for download', 'NOT_FOUND'))

    return ok(data)
  }

  public async delete(bucket: string, paths: string[]): Promise<Result<void>> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .remove(paths)

    if (error) return fail(new DomainError(error.message, 'STORAGE_ERROR'))
    return ok(undefined)
  }
}
