import { PdfPageConfig } from "@/modules/template/domain/types/pdf-page-config";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { IRecordDocumentRepository } from "../../domain/ports/record-document-repository.port";

interface RenderPdfPort {
  render(
    blocks: TemplateBlocks,
    title?: string,
    pageConfig?: PdfPageConfig | null,
  ): Promise<Buffer>;
}

export class RenderRecordDocumentPdfUseCase {
  constructor(
    private readonly repository: IRecordDocumentRepository,
    private readonly renderer: RenderPdfPort,
  ) {}

  async execute(params: {
    templateId: string;
    recordId: string;
    title?: string;
    pageConfig?: PdfPageConfig | null;
  }): Promise<Result<Buffer, DomainError>> {
    const document = await this.repository.findByTemplateAndRecord(
      params.templateId,
      params.recordId,
    );
    if (!document.ok) {
      return fail(document.error);
    }

    if (!document.value) {
      return fail(new DomainError("Record document not found", "DOCUMENT_NOT_FOUND"));
    }

    try {
      const buffer = await this.renderer.render(
        document.value.editedBlocks,
        params.title,
        params.pageConfig,
      );
      return ok(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "PDF render failed";
      return fail(new DomainError(message, "DOCUMENT_PDF_RENDER_FAILED"));
    }
  }
}
