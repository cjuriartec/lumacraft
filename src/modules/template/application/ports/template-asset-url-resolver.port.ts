import { DomainError, Result } from "@/shared/domain/result";

export interface TemplateAssetUrlResolverPort {
  resolveImageUrl(params: { bucket: string; path: string }): Promise<Result<string, DomainError>>;
}
