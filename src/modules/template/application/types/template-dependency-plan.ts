import { TemplatePreviewBlockMeta } from "../services/template-preview-block-metadata";

export type TemplateAIContextMode = "explicit_paths" | "minimal_summary" | "full_root";

export interface TemplateAIDependency {
  blockId: string;
  blockIndex: number;
  promptPaths: string[];
  contextMode: TemplateAIContextMode;
}

export interface TemplateDependencyPlan {
  blockMetadata: TemplatePreviewBlockMeta[];
  referencedPaths: string[];
  relationPaths: string[];
  aiBlocks: TemplateAIDependency[];
  imagePaths: string[];
  depth: number;
}

export interface ResolvedTemplateDependencyPlan extends TemplateDependencyPlan {
  eagerDepth: number;
  runtimeProjectionPaths: string[];
  fieldMetadataPaths: string[];
  requiresFieldMetadata: boolean;
  requiresCollectionContext: boolean;
  requiresMinimalSummary: boolean;
  requiresFullRoot: boolean;
  includeAllRelationPaths: boolean;
}

export interface TemplateDependencyFieldDescriptor {
  name: string;
  fieldType: string;
  targetCollectionId?: string | null;
}
