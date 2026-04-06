import { Result } from "@/shared/domain/result";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";

export class ListTemplatesUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(accountId: string): Promise<Result<Template[]>> {
    return this.repository.findByAccountId(accountId);
  }
}
