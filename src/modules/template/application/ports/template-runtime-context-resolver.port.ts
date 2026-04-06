import { Result } from "@/shared/domain/result";

import { TemplateRuntimeContext } from "../../domain/types/template-runtime-context";

export interface TemplateRuntimeContextResolverPort {
  resolve(params: {
    collectionId: string;
    recordId: string;
    depth?: number;
  }): Promise<Result<TemplateRuntimeContext>>;
}
