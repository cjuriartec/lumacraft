import { fail, Result } from "@/shared/domain/result";

import { Field } from "../../domain/entities/field.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";
import { FieldConfig } from "../../domain/value-objects/field-config.vo";
import { FieldType } from "../../domain/value-objects/field-type.vo";

export interface UpdateFieldRequest {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  fieldType: string;
  isRequired?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  config?: Record<string, unknown>;
  sortOrder?: number;
  collectionId: string;
}

export class UpdateFieldUseCase {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async execute(request: UpdateFieldRequest): Promise<Result<Field>> {
    const fieldTypeRes = FieldType.create(request.fieldType);
    if (!fieldTypeRes.ok) return fail(fieldTypeRes.error);

    const fieldConfigRes = FieldConfig.create(fieldTypeRes.value.value, request.config || {});
    if (!fieldConfigRes.ok) return fail(fieldConfigRes.error);

    const result = Field.create({
      id: request.id,
      collectionId: request.collectionId,
      name: request.name,
      displayName: request.displayName,
      description: request.description,
      fieldType: fieldTypeRes.value,
      isRequired: request.isRequired,
      isUnique: request.isUnique,
      defaultValue: request.defaultValue,
      config: fieldConfigRes.value,
      sortOrder: request.sortOrder,
    });

    if (!result.ok) {
      return result;
    }

    return this.fieldRepository.update(result.value);
  }
}
