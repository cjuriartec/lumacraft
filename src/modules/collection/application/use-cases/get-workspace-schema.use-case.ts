import { ok, Result } from "@/shared/domain/result";

import { Collection } from "../../domain/entities/collection.entity";
import { Field } from "../../domain/entities/field.entity";
import { ICollectionRepository } from "../../domain/ports/collection-repository.port";
import { IFieldRepository } from "../../domain/ports/field-repository.port";

export interface WorkspaceSchema {
  collections: Collection[];
  fields: Field[];
}

export class GetWorkspaceSchemaUseCase {
  constructor(
    private readonly collectionRepository: ICollectionRepository,
    private readonly fieldRepository: IFieldRepository,
  ) {}

  async execute(accountId: string): Promise<Result<WorkspaceSchema>> {
    const [collectionsRes, fieldsRes] = await Promise.all([
      this.collectionRepository.findByAccountId(accountId),
      this.fieldRepository.findByAccountId(accountId),
    ]);

    if (!collectionsRes.ok) return collectionsRes;
    if (!fieldsRes.ok) return fieldsRes;

    return ok({
      collections: collectionsRes.value,
      fields: fieldsRes.value,
    });
  }
}
