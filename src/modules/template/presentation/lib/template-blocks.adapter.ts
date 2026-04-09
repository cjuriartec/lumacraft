import type { TElement, Value } from "platejs";

import { isTemplateBlocks, TemplateBlocks } from "../../domain/types/template-blocks";

type PlateTextNode = {
  text: string;
  [key: string]: unknown;
};

type PlateDescendantNode = TElement | PlateTextNode;

const HEADING_LINE_PATTERN = /^(#{1,3})\s+(.+)$/;
const BULLET_LINE_PATTERN = /^[-*]\s+(.+)$/;
const NUMBER_LINE_PATTERN = /^\d+\.\s+(.+)$/;
const QUOTE_LINE_PATTERN = /^>\s+(.+)$/;
const IMAGE_LINE_PATTERN = /^!\[([^\]]*)\]\(([^)]+)\)$/;

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

function toTextNode(text: string): PlateTextNode {
  return { text };
}

function toParagraph(text: string): TElement {
  return {
    type: "p",
    children: [toTextNode(text)],
  };
}

function flattenNodeText(node: unknown): string {
  if (isPlateTextNode(node)) {
    return node.text;
  }

  if (!isPlateElementNode(node)) {
    return "";
  }

  if (node.type === "variable" && typeof node.fieldPath === "string") {
    return `{{${node.fieldPath}}}`;
  }

  if (node.type === "a") {
    const href = typeof node.url === "string" ? node.url : "";
    const label = node.children.map(flattenNodeText).join("");
    if (href && label) {
      return `[${label}](${href})`;
    }
  }

  if (node.type === "img") {
    const alt = node.children.map(flattenNodeText).join("");
    const path =
      typeof node.path === "string" ? node.path : typeof node.url === "string" ? node.url : "";

    if (path) {
      return `![${alt}](${path})`;
    }
  }

  return node.children.map(flattenNodeText).join("");
}

function serializePlateBlock(block: TElement): string {
  const text = block.children.map(flattenNodeText).join("");

  switch (block.type) {
    case "h1":
      return text ? `# ${text}` : "#";
    case "h2":
      return text ? `## ${text}` : "##";
    case "h3":
      return text ? `### ${text}` : "###";
    case "blockquote":
      return text ? `> ${text}` : ">";
    case "img": {
      const path =
        typeof block.path === "string"
          ? block.path
          : typeof block.url === "string"
            ? block.url
            : "";
      return path ? `![${text}](${path})` : text;
    }
    case "p":
    default:
      if (block.listStyleType === "disc") {
        return text ? `- ${text}` : "-";
      }

      if (block.listStyleType === "decimal") {
        return text ? `1. ${text}` : "1.";
      }

      return text;
  }
}

function parsePlainTextLine(line: string): TElement {
  const headingMatch = HEADING_LINE_PATTERN.exec(line);
  if (headingMatch) {
    return {
      type: `h${Math.min(3, Math.max(1, headingMatch[1].length))}`,
      children: [toTextNode(headingMatch[2])],
    };
  }

  const bulletMatch = BULLET_LINE_PATTERN.exec(line);
  if (bulletMatch) {
    return {
      type: "p",
      listStyleType: "disc",
      indent: 1,
      children: [toTextNode(bulletMatch[1])],
    };
  }

  const numberMatch = NUMBER_LINE_PATTERN.exec(line);
  if (numberMatch) {
    return {
      type: "p",
      listStyleType: "decimal",
      indent: 1,
      children: [toTextNode(numberMatch[1])],
    };
  }

  const quoteMatch = QUOTE_LINE_PATTERN.exec(line);
  if (quoteMatch) {
    return {
      type: "blockquote",
      children: [toTextNode(quoteMatch[1])],
    };
  }

  const imageMatch = IMAGE_LINE_PATTERN.exec(line.trim());
  if (imageMatch) {
    return {
      type: "img",
      url: imageMatch[2],
      path: imageMatch[2],
      children: [toTextNode(imageMatch[1])],
    };
  }

  return toParagraph(line);
}

export function templateBlocksToPlateValue(blocks: TemplateBlocks | null | undefined): Value {
  if (!isTemplateBlocks(blocks)) {
    return [toParagraph("")];
  }

  const value: TElement[] = [];
  for (const block of blocks) {
    if (isPlateElementNode(block)) {
      value.push(block);
    }
  }

  // Ensure trailing empty paragraph if the last block is a logic block or document is empty
  const lastBlock = value[value.length - 1];
  const LOGIC_TYPES = new Set([
    "template_ai",
    "template_conditional",
    "template_switch",
    "template_list",
  ]);

  if (!lastBlock || LOGIC_TYPES.has(lastBlock.type)) {
    value.push(toParagraph(""));
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

export function plainTextToTemplateBlocks(value: string): TemplateBlocks {
  const normalized = value.replace(/\r\n/g, "\n");
  if (!normalized.trim()) {
    return [];
  }

  const blocks = normalized.split("\n").map(parsePlainTextLine);
  const serializable = JSON.parse(JSON.stringify(blocks)) as unknown;
  return isTemplateBlocks(serializable) ? serializable : [];
}

export function templateBlocksToPlainText(
  blocks: TemplateBlocks | null | undefined,
  fallback = "",
): string {
  if (!isTemplateBlocks(blocks)) {
    return fallback;
  }

  const lines = (blocks as unknown[]).filter(isPlateElementNode).map(serializePlateBlock);
  const rendered = lines.join("\n");

  return rendered.length > 0 ? rendered : fallback;
}
