import { BaseEntity } from "@/shared/domain/base-entity";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { DisplayName } from "@/shared/domain/value-objects/display-name.vo";

import { isTemplateBlocks, TemplateBlocks } from "../types/template-blocks";

interface TemplateProps {
  id: string;
  accountId: string;
  name: DisplayName;
  description?: string;
  collectionId?: string | null;
  blocks: TemplateBlocks;
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

    return ok(
      new Template({
        ...props,
        name: nameResult.value,
        version: props.version ?? 1,
        blocks: props.blocks,
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
      version: this.version,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
