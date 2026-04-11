import { SupabaseClient } from "@supabase/supabase-js";

import { isTemplateBlocks, TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { BaseRepository } from "@/shared/infrastructure/base-repository";

import { RecordDocument } from "../../domain/entities/record-document.entity";
import { IRecordDocumentRepository } from "../../domain/ports/record-document-repository.port";

interface RecordDocumentRow {
  id: string;
  account_id: string;
  collection_id: string;
  record_id: string;
  template_id: string;
  compiled_blocks: unknown;
  edited_blocks: unknown;
  source_template_version: number | null;
  version: number | null;
  compiled_at: string | null;
  last_edited_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface RecordDocumentInsertRow {
  id: string;
  account_id: string;
  collection_id: string;
  record_id: string;
  template_id: string;
  compiled_blocks: TemplateBlocks;
  edited_blocks: TemplateBlocks;
  source_template_version: number;
  version: number;
  compiled_at: string | null;
  last_edited_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

interface RecordDocumentUpdateRow {
  compiled_blocks: TemplateBlocks;
  edited_blocks: TemplateBlocks;
  source_template_version: number;
  version: number;
  compiled_at: string | null;
  last_edited_at: string | null;
  updated_by: string | null;
  updated_at: string;
}

export class SupabaseRecordDocumentRepository
  extends BaseRepository
  implements IRecordDocumentRepository
{
  constructor(supabase: SupabaseClient) {
    super(supabase, "record_documents");
  }

  public async findByTemplateAndRecord(
    templateId: string,
    recordId: string,
  ): Promise<Result<RecordDocument | null, DomainError>> {
    const { data, error } = await this.table
      .select("*")
      .eq("template_id", templateId)
      .eq("record_id", recordId)
      .maybeSingle();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    if (!data) {
      return ok(null);
    }

    return this.toEntityResult(data as RecordDocumentRow);
  }

  public async create(document: RecordDocument): Promise<Result<RecordDocument, DomainError>> {
    const { data, error } = await this.table.insert(this.toInsertRow(document)).select().single();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    return this.toEntityResult(data as RecordDocumentRow);
  }

  public async update(
    document: RecordDocument,
    expectedVersion: number,
  ): Promise<Result<RecordDocument, DomainError>> {
    const { data, error } = await this.table
      .update(this.toUpdateRow(document))
      .eq("id", document.id)
      .eq("account_id", document.accountId)
      .eq("version", expectedVersion)
      .select()
      .maybeSingle();

    if (error) {
      return fail(new DomainError(error.message, "DB_ERROR"));
    }

    if (!data) {
      return fail(new DomainError("Record document version conflict", "DOCUMENT_VERSION_CONFLICT"));
    }

    return this.toEntityResult(data as RecordDocumentRow);
  }

  private toEntityResult(data: RecordDocumentRow): Result<RecordDocument, DomainError> {
    if (!isTemplateBlocks(data.compiled_blocks) || !isTemplateBlocks(data.edited_blocks)) {
      return fail(
        new DomainError("Invalid record document blocks payload", "DATA_INTEGRITY_ERROR"),
      );
    }

    return RecordDocument.create({
      id: data.id,
      accountId: data.account_id,
      collectionId: data.collection_id,
      recordId: data.record_id,
      templateId: data.template_id,
      compiledBlocks: data.compiled_blocks,
      editedBlocks: data.edited_blocks,
      sourceTemplateVersion: data.source_template_version ?? 1,
      version: data.version ?? 1,
      compiledAt: data.compiled_at ? new Date(data.compiled_at) : undefined,
      lastEditedAt: data.last_edited_at ? new Date(data.last_edited_at) : undefined,
      createdBy: data.created_by ?? undefined,
      updatedBy: data.updated_by ?? undefined,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    });
  }

  private toInsertRow(document: RecordDocument): RecordDocumentInsertRow {
    return {
      id: document.id,
      account_id: document.accountId,
      collection_id: document.collectionId,
      record_id: document.recordId,
      template_id: document.templateId,
      compiled_blocks: document.compiledBlocks,
      edited_blocks: document.editedBlocks,
      source_template_version: document.sourceTemplateVersion,
      version: document.version,
      compiled_at: document.compiledAt?.toISOString() ?? null,
      last_edited_at: document.lastEditedAt?.toISOString() ?? null,
      created_by: document.createdBy ?? null,
      updated_by: document.updatedBy ?? null,
    };
  }

  private toUpdateRow(document: RecordDocument): RecordDocumentUpdateRow {
    return {
      compiled_blocks: document.compiledBlocks,
      edited_blocks: document.editedBlocks,
      source_template_version: document.sourceTemplateVersion,
      version: document.version,
      compiled_at: document.compiledAt?.toISOString() ?? null,
      last_edited_at: document.lastEditedAt?.toISOString() ?? null,
      updated_by: document.updatedBy ?? null,
      updated_at: new Date().toISOString(),
    };
  }
}
