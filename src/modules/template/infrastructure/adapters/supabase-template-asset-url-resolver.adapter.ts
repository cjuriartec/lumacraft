import type { SupabaseClient } from "@supabase/supabase-js";

import { DomainError, fail, ok, type Result } from "@/shared/domain/result";

import type { TemplateAssetUrlResolverPort } from "../../application/ports/template-asset-url-resolver.port";

export class SupabaseTemplateAssetUrlResolverAdapter implements TemplateAssetUrlResolverPort {
  private readonly cache = new Map<string, string>();

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly signedUrlExpiresInSeconds = 60 * 30,
  ) {}

  public async resolveImageUrl(params: {
    bucket: string;
    path: string;
  }): Promise<Result<string, DomainError>> {
    const bucket = params.bucket.trim();
    const path = params.path.trim();
    if (!bucket || !path) {
      return fail(new DomainError("Bucket and path are required", "STORAGE_SIGNED_URL_ERROR"));
    }

    const cacheKey = `${bucket}:${path}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return ok(cached);
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, this.signedUrlExpiresInSeconds);

    if (error || !data?.signedUrl) {
      return fail(
        new DomainError(
          error?.message ?? "Could not create signed URL",
          "STORAGE_SIGNED_URL_ERROR",
        ),
      );
    }

    this.cache.set(cacheKey, data.signedUrl);
    return ok(data.signedUrl);
  }
}
