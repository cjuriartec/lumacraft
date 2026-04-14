import { PdfPageConfig } from "@/modules/template/domain/types/pdf-page-config";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";

export interface RecordDocumentDto {
  id: string;
  accountId: string;
  collectionId: string;
  recordId: string;
  templateId: string;
  compiledBlocks: TemplateBlocks;
  editedBlocks: TemplateBlocks;
  sourceTemplateVersion: number;
  version: number;
  compiledAt: string | null;
  lastEditedAt: string | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface RecordDocumentPreviewPayload {
  document: RecordDocumentDto;
  template: {
    id: string;
    name: string;
    collectionId: string | null;
    version: number;
    pageConfig?: PdfPageConfig | null;
  };
  record: {
    id: string;
    label: string;
  };
  permissions: {
    canRead: boolean;
    canUpdate: boolean;
  };
  warnings: string[];
}
