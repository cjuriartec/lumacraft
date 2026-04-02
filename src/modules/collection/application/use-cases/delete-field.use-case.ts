import { Result } from "@/shared/domain/result";

import { IFieldRepository } from "../../domain/ports/field-repository.port";

export class DeleteFieldUseCase {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async execute(id: string): Promise<Result<void>> {
    return this.fieldRepository.delete(id);
  }
}
