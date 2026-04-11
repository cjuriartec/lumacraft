import type { FieldTypeValue } from "@/modules/collection/domain/value-objects/field-type.vo";
import type { TemplateConditionOperator } from "@/modules/template/domain/types/template-logic-blocks";

import type {
  TemplateRelationCardinality,
  TemplateVariableCatalogNode,
} from "../types/template-variable-catalog";

export type TemplateValueInputStrategy = "text" | "number" | "boolean" | "enum" | "none";

export interface TemplateFieldSemantics {
  fieldType: FieldTypeValue;
  comparable: boolean;
  switchComparable: boolean;
  operators: TemplateConditionOperator[];
  inputStrategy: TemplateValueInputStrategy;
}

const PRESENCE_ONLY_OPERATORS: TemplateConditionOperator[] = ["is_empty", "not_empty"];
const DEFAULT_OPERATORS: TemplateConditionOperator[] = [
  "equals",
  "not_equals",
  "is_empty",
  "not_empty",
];
const NUMERIC_OPERATORS: TemplateConditionOperator[] = [
  "equals",
  "not_equals",
  "gt",
  "gte",
  "lt",
  "lte",
  "is_empty",
  "not_empty",
];
const TEXT_OPERATORS: TemplateConditionOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "is_empty",
  "not_empty",
];

export function getFieldSemantics(fieldType: FieldTypeValue): TemplateFieldSemantics {
  switch (fieldType) {
    case "BOOLEAN":
      return {
        fieldType,
        comparable: true,
        switchComparable: true,
        operators: ["equals", "not_equals"],
        inputStrategy: "boolean",
      };
    case "ENUM":
      return {
        fieldType,
        comparable: true,
        switchComparable: true,
        operators: ["equals", "not_equals"],
        inputStrategy: "enum",
      };
    case "NUMBER":
    case "DATE":
      return {
        fieldType,
        comparable: true,
        switchComparable: true,
        operators: NUMERIC_OPERATORS,
        inputStrategy: fieldType === "NUMBER" ? "number" : "text",
      };
    case "TEXT":
      return {
        fieldType,
        comparable: true,
        switchComparable: true,
        operators: TEXT_OPERATORS,
        inputStrategy: "text",
      };
    case "FILE":
    case "IMAGE":
    case "RELATION":
    case "REVERSE_LOOKUP":
      return {
        fieldType,
        comparable: false,
        switchComparable: false,
        operators: PRESENCE_ONLY_OPERATORS,
        inputStrategy: "none",
      };
    case "LOCATION":
      return {
        fieldType,
        comparable: false,
        switchComparable: false,
        operators: DEFAULT_OPERATORS,
        inputStrategy: "text",
      };
    default:
      return {
        fieldType,
        comparable: true,
        switchComparable: true,
        operators: DEFAULT_OPERATORS,
        inputStrategy: "text",
      };
  }
}

function walkCatalog(
  nodes: TemplateVariableCatalogNode[],
  callback: (node: TemplateVariableCatalogNode) => void,
) {
  for (const node of nodes) {
    callback(node);
    if (node.children && node.children.length > 0) {
      walkCatalog(node.children, callback);
    }
  }
}

export function flattenCatalog(
  nodes: TemplateVariableCatalogNode[],
): TemplateVariableCatalogNode[] {
  const flattened: TemplateVariableCatalogNode[] = [];
  walkCatalog(nodes, (node) => flattened.push(node));
  return flattened;
}

export function getNodeByPath(
  nodes: TemplateVariableCatalogNode[],
  path: string,
): TemplateVariableCatalogNode | undefined {
  let found: TemplateVariableCatalogNode | undefined;
  walkCatalog(nodes, (node) => {
    if (node.path === path) {
      found = node;
    }
  });
  return found;
}

export function isIterableRelation(cardinality: TemplateRelationCardinality | undefined): boolean {
  return cardinality === "ONE_TO_MANY" || cardinality === "MANY_TO_MANY";
}
