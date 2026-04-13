import { Result } from "@/shared/domain/result";

import { IFieldRepository } from "../../domain/ports/field-repository.port";
import { IRecordRepository } from "../../domain/ports/record-repository.port";

export class DeleteFieldUseCase {
  constructor(
    private readonly fieldRepository: IFieldRepository,
    private readonly recordRepository: IRecordRepository,
  ) {}

  async execute(id: string): Promise<Result<void>> {
    const fieldRes = await this.fieldRepository.findById(id);
    if (!fieldRes.ok || !fieldRes.value) {
      return this.fieldRepository.delete(id);
    }

    const field = fieldRes.value;

    // 1. Handle cascading delete for bidirectional reverse fields
    interface RelationConfig {
      targetCollectionId?: string;
    }
    interface ReverseLookupConfig {
      targetFieldId?: string;
    }

    if (field.fieldType.value === "RELATION") {
      const config = field.config?.value as RelationConfig | undefined;
      if (config?.targetCollectionId) {
        // Find reverse lookup field in target collection
        const targetFieldsRes = await this.fieldRepository.findByCollectionId(
          config.targetCollectionId,
        );
        if (targetFieldsRes.ok) {
          const reverseField = targetFieldsRes.value.find((f) => {
            const fConfig = f.config?.value as ReverseLookupConfig | undefined;
            return f.fieldType.value === "REVERSE_LOOKUP" && fConfig?.targetFieldId === id;
          });
          if (reverseField) {
            await this.fieldRepository.delete(reverseField.id);
          }
        }
      }
    }

    // 2. Delete Field Metadata
    const deleteRes = await this.fieldRepository.delete(id);
    if (!deleteRes.ok) return deleteRes;

    // 3. Purge Record Data (Cleanup JSONB keys)
    return this.recordRepository.deleteFieldData(field.collectionId, field.name);
  }
}
