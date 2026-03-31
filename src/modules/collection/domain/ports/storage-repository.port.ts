import { Result } from '@/shared/domain/result'

export interface IStorageRepository {
  upload(bucket: string, path: string, file: File): Promise<Result<{ path: string }>>
  download(bucket: string, path: string): Promise<Result<Blob>>
  delete(bucket: string, paths: string[]): Promise<Result<void>>
}
