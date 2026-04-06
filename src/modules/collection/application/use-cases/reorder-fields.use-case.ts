import { Result } from "@/shared/domain/result";

import { IFieldRepository } from "../../domain/ports/field-repository.port";

export class ReorderFieldsUseCase {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async execute(collectionId: string, fieldIds: string[]): Promise<Result<void>> {
    return this.fieldRepository.reorder(collectionId, fieldIds);
  }
}
