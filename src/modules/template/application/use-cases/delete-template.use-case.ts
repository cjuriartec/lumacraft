import { Result } from "@/shared/domain/result";

import { ITemplateRepository } from "../../domain/ports/template-repository.port";

export class DeleteTemplateUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(id: string): Promise<Result<void>> {
    return this.repository.delete(id);
  }
}
