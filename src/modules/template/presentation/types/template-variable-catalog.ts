import type { FieldTypeValue } from "@/modules/collection/domain/value-objects/field-type.vo";

export type TemplateRelationCardinality =
  | "ONE_TO_ONE"
  | "ONE_TO_MANY"
  | "MANY_TO_ONE"
  | "MANY_TO_MANY"
  | null;

export interface TemplateCollectionContext {
  id: string;
  name: string;
  description?: string;
}

export interface TemplateVariableCatalogNode {
  path: string;
  displayName: string;
  fieldType: FieldTypeValue;
  collectionId: string;
  collectionName?: string;
  collectionDescription?: string;
  cardinality?: TemplateRelationCardinality;
  enumOptions?: string[];
  sampleValue?: unknown;
  children?: TemplateVariableCatalogNode[];
}
