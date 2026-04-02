import { DomainError, fail, Result } from "@/shared/domain/result";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";

export class UpdateTemplateUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(params: {
    id: string;
    accountId: string;
    name: string;
    description?: string;
    collectionId?: string | null;
    blocks?: unknown[];
  }): Promise<Result<Template>> {
    const templateRes = await this.repository.findById(params.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!templateRes.ok) return templateRes as any;
    if (!templateRes.value) {
      return fail(new DomainError("Template not found", "NOT_FOUND"));
    }

    const updatedResult = Template.create({
      id: params.id,
      accountId: params.accountId,
      name: params.name,
      description: params.description ?? templateRes.value.description,
      collectionId: params.collectionId ?? templateRes.value.collectionId,
      blocks: params.blocks ?? templateRes.value.blocks,
      version: templateRes.value.version,
      createdBy: templateRes.value.createdBy,
      createdAt: templateRes.value.createdAt,
    });

    if (!updatedResult.ok) return updatedResult;

    return this.repository.update(updatedResult.value);
  }
}
