import { DomainError, Result } from "@/shared/domain/result";

import { RecordDocument } from "../entities/record-document.entity";

export interface IRecordDocumentRepository {
  findByTemplateAndRecord(
    templateId: string,
    recordId: string,
  ): Promise<Result<RecordDocument | null, DomainError>>;
  create(document: RecordDocument): Promise<Result<RecordDocument, DomainError>>;
  update(
    document: RecordDocument,
    expectedVersion: number,
  ): Promise<Result<RecordDocument, DomainError>>;
}
