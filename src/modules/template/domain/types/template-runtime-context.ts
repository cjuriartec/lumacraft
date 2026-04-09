export interface TemplateRuntimeFieldMetadata {
  path: string;
  displayName: string;
  description?: string;
  fieldType: string;
  enumOptions?: string[];
  collectionId: string;
  relationType?: string | null;
  isRequired?: boolean;
  isUnique?: boolean;
}

export interface TemplateRuntimeContext {
  recordId: string;
  collectionId: string;
  collectionName: string;
  collectionDescription?: string | null;
  root: Record<string, unknown>;
  fieldMetadataByPath?: Record<string, TemplateRuntimeFieldMetadata>;
}

export interface TemplateRuntimeScope {
  root: Record<string, unknown>;
  locals: Record<string, unknown>;
}
