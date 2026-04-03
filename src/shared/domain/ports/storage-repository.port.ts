import { Result } from "@/shared/domain/result";

/**
 * Port: Storage Repository
 *
 * Defines the contract for file storage operations.
 * This is a shared cross-cutting concern used across modules
 * (templates, collections, profiles, etc.).
 *
 * Infrastructure adapters (e.g., Supabase Storage) implement this interface.
 */
export interface IStorageRepository {
  /**
   * Uploads a file to the specified bucket under the given path.
   * @returns The public URL of the uploaded file.
   */
  upload(bucket: string, path: string, file: File): Promise<Result<{ url: string }>>;
}
