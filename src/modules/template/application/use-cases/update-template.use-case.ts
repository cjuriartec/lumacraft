import { DomainError, fail, Result } from "@/shared/domain/result";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";
import type { TemplateBlocks } from "../../domain/types/template-blocks";

export class UpdateTemplateUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(params: {
    id: string;
    accountId: string;
    name: string;
    description?: string;
    collectionId?: string | null;
    blocks?: TemplateBlocks;
  }): Promise<Result<Template>> {
    const templateRes = await this.repository.findById(params.id);
    if (!templateRes.ok) return fail(templateRes.error);
    if (!templateRes.value) {
      return fail(new DomainError("Template not found", "NOT_FOUND"));
    }

    if (templateRes.value.accountId !== params.accountId) {
      return fail(
        new DomainError("Template does not belong to this account", "TEMPLATE_ACCOUNT_MISMATCH"),
      );
    }

    const currentVersion = templateRes.value.version;
    const updatedResult = Template.create({
      id: params.id,
      accountId: params.accountId,
      name: params.name,
      description: params.description ?? templateRes.value.description,
      collectionId: params.collectionId ?? templateRes.value.collectionId,
      blocks: params.blocks ?? templateRes.value.blocks,
      version: currentVersion + 1,
      createdBy: templateRes.value.createdBy,
      createdAt: templateRes.value.createdAt,
    });

    if (!updatedResult.ok) return updatedResult;

    return this.repository.update(updatedResult.value, currentVersion);
  }
}
