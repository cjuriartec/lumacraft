import { Result } from "@/shared/domain/result";

import { Template } from "../entities/template.entity";

export interface TemplateHeader {
  id: string;
  accountId: string;
  collectionId?: string | null;
  version: number;
}

export interface ITemplateRepository {
  findById(id: string): Promise<Result<Template | null>>;
  findHeaderById(id: string): Promise<Result<TemplateHeader | null>>;
  findByAccountId(accountId: string): Promise<Result<Template[]>>;
  create(template: Template): Promise<Result<Template>>;
  update(template: Template, expectedVersion: number): Promise<Result<Template>>;
  delete(id: string): Promise<Result<void>>;
  count(accountId: string): Promise<Result<number>>;
}
