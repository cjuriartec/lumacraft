import { Result } from "@/shared/domain/result";

import { IStorageRepository } from "../../domain/ports/storage-repository.port";

export class UploadFileUseCase {
  constructor(private storageRepository: IStorageRepository) {}

  public async execute(
    bucket: string,
    path: string,
    file: File,
  ): Promise<Result<{ path: string }>> {
    return this.storageRepository.upload(bucket, path, file);
  }
}

export class DeleteFileUseCase {
  constructor(private storageRepository: IStorageRepository) {}

  public async execute(bucket: string, paths: string[]): Promise<Result<void>> {
    return this.storageRepository.delete(bucket, paths);
  }
}
