import { DomainError, Result } from "@/shared/domain/result";

import { TemplateBlocks } from "../../domain/types/template-blocks";

export interface PersistedTemplateAIBlockCacheEntry {
  cacheKey: string;
  blocks: TemplateBlocks;
  warnings: string[];
  lastUsedAt?: Date;
}

export interface TemplateAIBlockCachePort {
  findByKey(
    cacheKey: string,
  ): Promise<Result<PersistedTemplateAIBlockCacheEntry | null, DomainError>>;
  save(params: {
    cacheKey: string;
    accountId: string;
    providerId: string;
    model: string;
    blocks: TemplateBlocks;
    warnings: string[];
  }): Promise<Result<void, DomainError>>;
}
