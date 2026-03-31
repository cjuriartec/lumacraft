import { IStorageRepository } from '../../domain/ports/storage-repository.port'
import { Result } from '@/shared/domain/result'

export class DownloadFileUseCase {
  constructor(private storageRepository: IStorageRepository) {}

  public async execute(bucket: string, path: string): Promise<Result<Blob>> {
    return this.storageRepository.download(bucket, path)
  }
}
