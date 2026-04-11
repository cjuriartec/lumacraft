import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { DomainError, fail, Result } from "@/shared/domain/result";

import { RecordDocument } from "../../domain/entities/record-document.entity";
import { IRecordDocumentRepository } from "../../domain/ports/record-document-repository.port";

export class SaveRecordDocumentEditsUseCase {
  constructor(private readonly repository: IRecordDocumentRepository) {}

  async execute(params: {
    templateId: string;
    recordId: string;
    editedBlocks: TemplateBlocks;
    expectedVersion: number;
    userId?: string;
  }): Promise<Result<RecordDocument, DomainError>> {
    const current = await this.repository.findByTemplateAndRecord(
      params.templateId,
      params.recordId,
    );
    if (!current.ok) {
      return fail(current.error);
    }

    if (!current.value) {
      return fail(new DomainError("Record document not found", "DOCUMENT_NOT_FOUND"));
    }

    const now = new Date();
    const updated = RecordDocument.create({
      ...current.value.toJSON(),
      editedBlocks: params.editedBlocks,
      version: current.value.version + 1,
      lastEditedAt: now,
      updatedBy: params.userId,
      updatedAt: now,
    });

    if (!updated.ok) {
      return fail(updated.error);
    }

    return this.repository.update(updated.value, params.expectedVersion);
  }
}
