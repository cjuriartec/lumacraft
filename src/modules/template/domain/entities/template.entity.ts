import { BaseEntity } from "@/shared/domain/base-entity";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";

import { isPdfPageConfig, PdfPageConfig } from "../types/pdf-page-config";
import { isTemplateBlocks, TemplateBlocks } from "../types/template-blocks";

interface TemplateProps {
  id: string;
  accountId: string;
  name: DisplayName;
  description?: string;
  collectionId?: string | null;
  blocks: TemplateBlocks;
  pageConfig?: PdfPageConfig | null;
  version: number;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Template extends BaseEntity {
  private props: TemplateProps;

  constructor(props: TemplateProps) {
    super(props.id, props.createdAt, props.updatedAt);
    this.props = props;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get name(): string {
    return this.props.name.value;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get collectionId(): string | undefined | null {
    return this.props.collectionId;
  }

  get blocks(): TemplateBlocks {
    return this.props.blocks;
  }

  get pageConfig(): PdfPageConfig | null {
    return this.props.pageConfig ?? null;
  }

  get version(): number {
    return this.props.version;
  }

  get createdBy(): string | undefined {
    return this.props.createdBy;
  }

  public static create(props: {
    id: string;
    accountId: string;
    name: string;
    description?: string;
    collectionId?: string | null;
    blocks: TemplateBlocks;
    pageConfig?: PdfPageConfig | null;
    version?: number;
    createdBy?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Result<Template> {
    const nameResult = DisplayName.create(props.name, "Name");
    if (!nameResult.ok) return fail(nameResult.error);

    if (!isTemplateBlocks(props.blocks)) {
      return fail(new DomainError("Template blocks must be a valid JSON array", "INVALID_BLOCKS"));
    }

    if (
      props.pageConfig !== undefined &&
      props.pageConfig !== null &&
      !isPdfPageConfig(props.pageConfig)
    ) {
      return fail(
        new DomainError(
          "Template page config must be a valid PdfPageConfig object",
          "INVALID_PAGE_CONFIG",
        ),
      );
    }

    return ok(
      new Template({
        ...props,
        name: nameResult.value,
        version: props.version ?? 1,
        blocks: props.blocks,
        pageConfig: props.pageConfig ?? null,
      }),
    );
  }

  public toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      name: this.name,
      description: this.description,
      collectionId: this.collectionId,
      blocks: this.blocks,
      pageConfig: this.pageConfig,
      version: this.version,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
