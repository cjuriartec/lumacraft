import { Result } from "@/shared/domain/result";

import { Template } from "../entities/template.entity";

export interface ITemplateRepository {
  findById(id: string): Promise<Result<Template | null>>;
  findByAccountId(accountId: string): Promise<Result<Template[]>>;
  create(template: Template): Promise<Result<Template>>;
  update(template: Template): Promise<Result<Template>>;
  delete(id: string): Promise<Result<void>>;
}
