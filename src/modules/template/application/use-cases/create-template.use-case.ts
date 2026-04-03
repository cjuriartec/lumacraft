import { Result } from "@/shared/domain/result";

import { Template } from "../../domain/entities/template.entity";
import { ITemplateRepository } from "../../domain/ports/template-repository.port";
import type { TemplateBlocks } from "../../domain/types/template-blocks";

export class CreateTemplateUseCase {
  constructor(private readonly repository: ITemplateRepository) {}

  async execute(params: {
    accountId: string;
    name: string;
    description?: string;
    collectionId?: string | null;
    blocks?: TemplateBlocks;
    createdBy?: string;
  }): Promise<Result<Template>> {
    const result = Template.create({
      id: crypto.randomUUID(),
      accountId: params.accountId,
      name: params.name,
      description: params.description,
      collectionId: params.collectionId,
      blocks: params.blocks || [],
      createdBy: params.createdBy,
    });

    if (!result.ok) return result;

    return this.repository.create(result.value);
  }
}
