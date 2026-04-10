import { Result } from "@/shared/domain/result";

import { Field } from "../../domain/entities/field.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";

export class GetFieldUseCase {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async execute(id: string): Promise<Result<Field | null>> {
    return this.fieldRepository.findById(id);
  }
}
