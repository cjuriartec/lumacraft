import { Result } from "@/shared/domain/result";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";

export class GetTemplateUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(id: string): Promise<Result<Template | null>> {
    return this.repository.findById(id);
  }
}
