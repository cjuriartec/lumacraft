import { DomainError, Result } from "@/shared/domain/result";

import { RecordDocument } from "../../domain/entities/record-document.entity";
import { IRecordDocumentRepository } from "../../domain/ports/record-document-repository.port";

export class GetRecordDocumentUseCase {
  constructor(private readonly repository: IRecordDocumentRepository) {}

  async execute(params: {
    templateId: string;
    recordId: string;
  }): Promise<Result<RecordDocument | null, DomainError>> {
    return this.repository.findByTemplateAndRecord(params.templateId, params.recordId);
  }
}
