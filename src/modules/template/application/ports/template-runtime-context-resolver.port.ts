import { Result } from "@/shared/domain/result";

import { TemplateRuntimeContext } from "../../domain/types/template-runtime-context";
import { TemplateDependencyPlan } from "../types/template-dependency-plan";

export interface TemplateRuntimeContextResolverPort {
  resolve(params: {
    collectionId: string;
    recordId: string;
    depth?: number;
    dependencyPlan?: TemplateDependencyPlan;
  }): Promise<Result<TemplateRuntimeContext>>;
}
