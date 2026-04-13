import { Result } from "@/shared/domain/result";

export interface IStorageRepository {
  upload(bucket: string, path: string, file: File): Promise<Result<{ path: string }>>;
  download(bucket: string, path: string): Promise<Result<Blob>>;
  getPublicUrl(bucket: string, path: string): Result<string>;
  delete(bucket: string, paths: string[]): Promise<Result<void>>;
}
