import { Result } from "@/shared/domain/result";

import { IStorageRepository } from "../../domain/ports/storage-repository.port";

export class GetPublicUrlUseCase {
  constructor(private storageRepository: IStorageRepository) {}

  public execute(bucket: string, path: string): Result<string> {
    return this.storageRepository.getPublicUrl(bucket, path);
  }
}
