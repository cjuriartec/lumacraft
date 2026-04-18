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

    const normalizedConfig =
      fieldTypeRes.value.value === "RELATION"
        ? {
            ...(request.config || {}),
            bidirectional: true,
          }
        : request.config || {};

    // 2. Validate config
    let fieldConfigRes: Result<FieldConfig>;
    try {
      fieldConfigRes = FieldConfig.create(fieldTypeRes.value.value, normalizedConfig);
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
    const createdRes = await this.fieldRepository.create(result.value);
    if (!createdRes.ok) return createdRes;

    const createdField = createdRes.value;

    // 5. Bidirectional Relation: Create Reverse Lookup Field
    interface RelationConfig {
      targetCollectionId?: string;
      inverseFieldName?: string;
    }

    const config = createdField.config?.value as RelationConfig | undefined;

    if (createdField.fieldType.value === "RELATION") {
      const targetCollectionId = config?.targetCollectionId;
      const inverseFieldName = config?.inverseFieldName || `${request.name}_inverse`;

      if (!targetCollectionId) return createdRes; // Safety check

      const reverseFieldTypeRes = FieldType.create("REVERSE_LOOKUP");
      if (reverseFieldTypeRes.ok) {
        const reverseConfigRes = FieldConfig.create("REVERSE_LOOKUP", {
          targetCollectionId: request.collectionId,
          targetFieldId: createdField.id,
          hidden: true,
        });

        if (reverseConfigRes.ok) {
          const reverseFieldRes = Field.create({
            id: crypto.randomUUID(),
            collectionId: targetCollectionId,
            name: inverseFieldName.toLowerCase().replace(/\s+/g, "_"),
            displayName:
              config.inverseFieldName ||
              `REVERSE: ${createdField.displayName || createdField.name}`,
            fieldType: reverseFieldTypeRes.value,
            config: reverseConfigRes.value,
            isRequired: false,
            isUnique: false,
          });

          if (reverseFieldRes.ok) {
            await this.fieldRepository.create(reverseFieldRes.value);
          }
        }
      }
    }

    return createdRes;
  }
}
