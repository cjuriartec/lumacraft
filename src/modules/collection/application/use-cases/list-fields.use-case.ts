import { Result } from "@/shared/domain/result";

import { Field } from "../../domain/entities/field.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";

export class ListFieldsUseCase {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async execute(collectionId: string): Promise<Result<Field[]>> {
    return this.fieldRepository.findByCollectionId(collectionId);
  }
}
