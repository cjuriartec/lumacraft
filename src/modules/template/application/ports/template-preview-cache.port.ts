import { DomainError, Result } from "@/shared/domain/result";

import { TemplateBlocks } from "../../domain/types/template-blocks";

export interface PersistedTemplatePreviewCacheEntry {
  cacheKey: string;
  blocks: TemplateBlocks;
  warnings: string[];
  lastUsedAt?: Date;
}

export interface TemplatePreviewCachePort {
  findByKey(
    cacheKey: string,
  ): Promise<Result<PersistedTemplatePreviewCacheEntry | null, DomainError>>;
  save(params: {
    cacheKey: string;
    accountId: string;
    templateId: string;
    templateVersion: number;
    recordId: string;
    blocks: TemplateBlocks;
    warnings: string[];
  }): Promise<Result<void, DomainError>>;
}
