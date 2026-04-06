import { TemplateBlocks } from "../../domain/types/template-blocks";

export interface TemplatePreviewBlockMeta {
  blockId: string;
  blockIndex: number;
  blockType: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBlockId(block: unknown, index: number): string {
  if (isRecord(block) && typeof block.id === "string" && block.id.trim().length > 0) {
    return block.id.trim();
  }

  return `preview-block-${index}`;
}

function getBlockType(block: unknown): string {
  if (isRecord(block) && typeof block.type === "string" && block.type.trim().length > 0) {
    return block.type.trim();
  }

  return "unknown";
}

export function getTemplatePreviewBlockMetadata(
  blocks: TemplateBlocks,
): TemplatePreviewBlockMeta[] {
  return blocks.map((block, index) => ({
    blockId: getBlockId(block, index),
    blockIndex: index,
    blockType: getBlockType(block),
  }));
}
