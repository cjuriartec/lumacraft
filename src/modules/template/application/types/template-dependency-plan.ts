import { TemplatePreviewBlockMeta } from "../services/template-preview-block-metadata";

export interface TemplateAIDependency {
  blockId: string;
  blockIndex: number;
  promptPaths: string[];
  requiresFullContext: boolean;
}

export interface TemplateDependencyPlan {
  blockMetadata: TemplatePreviewBlockMeta[];
  referencedPaths: string[];
  relationPaths: string[];
  aiBlocks: TemplateAIDependency[];
  imagePaths: string[];
  depth: number;
}
