import { TemplatePreviewResult } from "@/modules/template/application/services/template-preview.types";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { RecordDocument } from "../../domain/entities/record-document.entity";
import { IRecordDocumentRepository } from "../../domain/ports/record-document-repository.port";

interface CompileDocumentPreviewPort {
  execute(): Promise<Result<TemplatePreviewResult, DomainError>>;
}

interface CompileRecordDocumentIfMissingResult {
  compiled: boolean;
  document: RecordDocument;
  warnings: string[];
}

export class CompileRecordDocumentIfMissingUseCase {
  constructor(private readonly repository: IRecordDocumentRepository) {}

  async execute(params: {
    accountId: string;
    collectionId: string;
    recordId: string;
    templateId: string;
    templateVersion: number;
    userId?: string;
    compilePreview: CompileDocumentPreviewPort;
    existingDocument?: RecordDocument | null;
  }): Promise<Result<CompileRecordDocumentIfMissingResult, DomainError>> {
    const existing = params.existingDocument
      ? ok(params.existingDocument)
      : await this.repository.findByTemplateAndRecord(params.templateId, params.recordId);
    if (!existing.ok) {
      return fail(existing.error);
    }

    if (existing.value) {
      return ok({
        compiled: false,
        document: existing.value,
        warnings: [],
      });
    }

    const compiledResult = await params.compilePreview.execute();
    if (!compiledResult.ok) {
      return fail(compiledResult.error);
    }

    const now = new Date();
    const documentResult = RecordDocument.create({
      id: crypto.randomUUID(),
      accountId: params.accountId,
      collectionId: params.collectionId,
      recordId: params.recordId,
      templateId: params.templateId,
      compiledBlocks: compiledResult.value.blocks,
      editedBlocks: compiledResult.value.blocks,
      sourceTemplateVersion: params.templateVersion,
      version: 1,
      compiledAt: now,
      lastEditedAt: now,
      createdBy: params.userId,
      updatedBy: params.userId,
      createdAt: now,
      updatedAt: now,
    });

    if (!documentResult.ok) {
      return fail(documentResult.error);
    }

    const created = await this.repository.create(documentResult.value);
    if (!created.ok) {
      return fail(created.error);
    }

    return ok({
      compiled: true,
      document: created.value,
      warnings: compiledResult.value.warnings,
    });
  }
}
