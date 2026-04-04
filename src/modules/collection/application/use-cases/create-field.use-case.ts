import { DomainError, fail, Result } from "@/shared/domain/result";

import { Field } from "../../domain/entities/field.entity";
import { IFieldRepository } from "../../domain/ports/field-repository.port";
import { FieldConfig } from "../../domain/value-objects/field-config.vo";
import { FieldType } from "../../domain/value-objects/field-type.vo";

export interface CreateFieldRequest {
  collectionId: string;
  name: string;
  displayName?: string;
  description?: string;
  fieldType: string;
  isRequired?: boolean;
  isUnique?: boolean;
  defaultValue?: string;
  config?: Record<string, unknown>;
  sortOrder?: number;
}

export class CreateFieldUseCase {
  constructor(private readonly fieldRepository: IFieldRepository) {}

  async execute(request: CreateFieldRequest): Promise<Result<Field>> {
    // 1. Validate field type
    const fieldTypeRes = FieldType.create(request.fieldType);
    if (!fieldTypeRes.ok) return fail(fieldTypeRes.error);

    // 2. Validate config
    let fieldConfigRes: Result<FieldConfig>;
    try {
      fieldConfigRes = FieldConfig.create(fieldTypeRes.value.value, request.config || {});
    } catch (error) {
      return fail(
        new DomainError(
          `Unexpected field config error for ${fieldTypeRes.value.value}: ${(error as Error).message}`,
          "INVALID_FIELD_CONFIG",
        ),
      );
    }
    if (!fieldConfigRes.ok) return fail(fieldConfigRes.error);

    // 3. Create entity
    const result = Field.create({
      id: crypto.randomUUID(),
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

    // 4. Persistence
    return this.fieldRepository.create(result.value);
  }
}
