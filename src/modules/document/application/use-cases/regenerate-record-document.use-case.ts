import { TemplatePreviewResult } from "@/modules/template/application/services/template-preview.types";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { RecordDocument } from "../../domain/entities/record-document.entity";
import { IRecordDocumentRepository } from "../../domain/ports/record-document-repository.port";

interface RegenerateDocumentPreviewPort {
  execute(): Promise<Result<TemplatePreviewResult, DomainError>>;
}

interface RegenerateRecordDocumentResult {
  document: RecordDocument;
  warnings: string[];
}

export class RegenerateRecordDocumentUseCase {
  constructor(private readonly repository: IRecordDocumentRepository) {}

  async execute(params: {
    accountId: string;
    collectionId: string;
    recordId: string;
    templateId: string;
    templateVersion: number;
    userId?: string;
    compilePreview: RegenerateDocumentPreviewPort;
  }): Promise<Result<RegenerateRecordDocumentResult, DomainError>> {
    const current = await this.repository.findByTemplateAndRecord(
      params.templateId,
      params.recordId,
    );
    if (!current.ok) {
      return fail(current.error);
    }

    const compiledResult = await params.compilePreview.execute();
    if (!compiledResult.ok) {
      return fail(compiledResult.error);
    }

    const now = new Date();
    const nextVersion = current.value ? current.value.version + 1 : 1;
    const documentResult = RecordDocument.create({
      id: current.value?.id ?? crypto.randomUUID(),
      accountId: params.accountId,
      collectionId: params.collectionId,
      recordId: params.recordId,
      templateId: params.templateId,
      compiledBlocks: compiledResult.value.blocks,
      editedBlocks: compiledResult.value.blocks,
      sourceTemplateVersion: params.templateVersion,
      version: nextVersion,
      compiledAt: now,
      lastEditedAt: now,
      createdBy: current.value?.createdBy ?? params.userId,
      updatedBy: params.userId,
      createdAt: current.value?.createdAt ?? now,
      updatedAt: now,
    });

    if (!documentResult.ok) {
      return fail(documentResult.error);
    }

    const persisted = current.value
      ? await this.repository.update(documentResult.value, current.value.version)
      : await this.repository.create(documentResult.value);

    if (!persisted.ok) {
      return fail(persisted.error);
    }

    return ok({
      document: persisted.value,
      warnings: compiledResult.value.warnings,
    });
  }
}
