import type { TElement, Value } from "platejs";

import { isTemplateBlocks, TemplateBlocks } from "../../domain/types/template-blocks";

type PlateTextNode = {
  text: string;
  [key: string]: unknown;
};

type PlateDescendantNode = TElement | PlateTextNode;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlateTextNode(value: unknown): value is PlateTextNode {
  return isRecord(value) && typeof value.text === "string";
}

function isPlateElementNode(value: unknown): value is TElement {
  if (!isRecord(value)) return false;
  if (typeof value.type !== "string") return false;
  if (!Array.isArray(value.children)) return false;

  return value.children.every(isPlateDescendantNode);
}

function isPlateDescendantNode(value: unknown): value is PlateDescendantNode {
  return isPlateTextNode(value) || isPlateElementNode(value);
}

export function templateBlocksToPlateValue(blocks: TemplateBlocks | null | undefined): Value {
  if (!isTemplateBlocks(blocks)) return [];

  const value: TElement[] = [];
  for (const block of blocks) {
    if (isPlateElementNode(block)) {
      value.push(block);
    }
  }

  return value;
}

export function plateValueToTemplateBlocks(value: unknown): TemplateBlocks {
  if (!Array.isArray(value) || !value.every(isPlateElementNode)) {
    return [];
  }

  const serializable = JSON.parse(JSON.stringify(value)) as unknown;
  return isTemplateBlocks(serializable) ? serializable : [];
}
