import { isTemplateBlocks, TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { BaseEntity } from "@/shared/domain/base-entity";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

interface RecordDocumentProps {
  id: string;
  accountId: string;
  collectionId: string;
  recordId: string;
  templateId: string;
  compiledBlocks: TemplateBlocks;
  editedBlocks: TemplateBlocks;
  sourceTemplateVersion: number;
  version: number;
  compiledAt?: Date;
  lastEditedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RecordDocument extends BaseEntity {
  private props: RecordDocumentProps;

  constructor(props: RecordDocumentProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get collectionId(): string {
    return this.props.collectionId;
  }

  get recordId(): string {
    return this.props.recordId;
  }

  get templateId(): string {
    return this.props.templateId;
  }

  get compiledBlocks(): TemplateBlocks {
    return this.props.compiledBlocks;
  }

  get editedBlocks(): TemplateBlocks {
    return this.props.editedBlocks;
  }

  get sourceTemplateVersion(): number {
    return this.props.sourceTemplateVersion;
  }

  get version(): number {
    return this.props.version;
  }

  get compiledAt(): Date | undefined {
    return this.props.compiledAt;
  }

  get lastEditedAt(): Date | undefined {
    return this.props.lastEditedAt;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
  }

  get updatedBy(): string | undefined {
    return this.props.updatedBy;
  }

  public static create(props: {
    id: string;
    accountId: string;
    collectionId: string;
    recordId: string;
    templateId: string;
    compiledBlocks: TemplateBlocks;
    editedBlocks: TemplateBlocks;
    sourceTemplateVersion: number;
    version?: number;
    compiledAt?: Date;
    lastEditedAt?: Date;
    createdBy?: string;
    updatedBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<RecordDocument, DomainError> {
    if (!props.accountId || !props.collectionId || !props.recordId || !props.templateId) {
      return fail(
        new DomainError(
          "Record document requires accountId, collectionId, recordId and templateId",
          "INVALID_RECORD_DOCUMENT",
        ),
      );
    }

    if (!isTemplateBlocks(props.compiledBlocks) || !isTemplateBlocks(props.editedBlocks)) {
      return fail(
        new DomainError(
          "Record document blocks must be valid JSON arrays",
          "INVALID_RECORD_DOCUMENT_BLOCKS",
        ),
      );
    }

    if (!Number.isInteger(props.sourceTemplateVersion) || props.sourceTemplateVersion < 1) {
      return fail(
        new DomainError(
          "Record document sourceTemplateVersion must be a positive integer",
          "INVALID_RECORD_DOCUMENT",
        ),
      );
    }

    const version = props.version ?? 1;
    if (!Number.isInteger(version) || version < 1) {
      return fail(
        new DomainError(
          "Record document version must be a positive integer",
          "INVALID_RECORD_DOCUMENT",
        ),
      );
    }

    return ok(
      new RecordDocument({
        ...props,
        version,
      }),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      collectionId: this.collectionId,
      recordId: this.recordId,
      templateId: this.templateId,
      compiledBlocks: this.compiledBlocks,
      editedBlocks: this.editedBlocks,
      sourceTemplateVersion: this.sourceTemplateVersion,
      version: this.version,
      compiledAt: this.compiledAt,
      lastEditedAt: this.lastEditedAt,
      createdBy: this.createdBy,
      updatedBy: this.updatedBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
