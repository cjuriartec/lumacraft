import { DomainError, fail, type Result } from "@/shared/domain/result";

import type { IStorageRepository } from "../domain/ports/storage-repository.port";

/**
 * Use Case: Upload File
 *
 * Orchestrates the upload of a file to a storage bucket.
 * Generates a unique path to avoid collisions, then delegates
 * to the injected IStorageRepository adapter.
 */
export class UploadFileUseCase {
  constructor(private readonly storageRepository: IStorageRepository) {}

  async execute(params: {
    bucket: string;
    file: File;
    folder?: string;
  }): Promise<Result<{ url: string }>> {
    const { bucket, file, folder } = params;

    // Generate a unique path: folder/uuid-filename
    const uniqueId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = folder ? `${folder}/${uniqueId}-${safeName}` : `${uniqueId}-${safeName}`;

    const result = await this.storageRepository.upload(bucket, path, file);

    if (!result.ok) {
      return fail(new DomainError(`Failed to upload file: ${result.error}`, "UPLOAD_ERROR"));
    }

    return result;
  }
}
