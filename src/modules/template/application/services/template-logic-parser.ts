import type { TemplateBlocks } from "../../domain/types/template-blocks";
import {
  parseTemplateLogicBlocks,
  TemplateConditionOperator,
  TemplateLogicBlock,
  TemplatePrimitive,
} from "../../domain/types/template-logic-blocks";

interface PlateTextNode {
  text: string;
}

interface PlateElementNode {
  type: string;
  children?: unknown[];
  [key: string]: unknown;
}

const PARAGRAPH_LIKE_NODE_TYPES = new Set(["p", "h1", "h2", "h3", "blockquote", "li", "todo_li"]);

const STANDALONE_TEMPLATE_NODE_TYPES = new Set([
  "template_conditional",
  "template_list",
  "template_switch",
  "template_ai",
]);

export interface ParseTemplateBlocksResult {
  blocks: TemplateLogicBlock[];
  warnings: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlateTextNode(value: unknown): value is PlateTextNode {
  return isRecord(value) && typeof value.text === "string";
}

function isPlateElementNode(value: unknown): value is PlateElementNode {
  return isRecord(value) && typeof value.type === "string";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asPrimitive(value: unknown): TemplatePrimitive | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value === null) {
    return null;
  }

  return undefined;
}

function parseConditionOperator(value: unknown): TemplateConditionOperator {
  switch (value) {
    case "equals":
    case "not_equals":
    case "contains":
    case "gt":
    case "gte":
    case "lt":
    case "lte":
    case "is_empty":
    case "not_empty":
      return value;
    default:
      return "equals";
  }
}

function extractNodeText(node: unknown): string {
  if (isPlateTextNode(node)) {
    return node.text;
  }

  if (!isPlateElementNode(node)) {
    return "";
  }

  if (node.type === "variable" && typeof node.fieldPath === "string") {
    return `{{${node.fieldPath}}}`;
  }

  const children = Array.isArray(node.children) ? node.children : [];
  return children.map(extractNodeText).join("");
}

function ensureBlocksFromText(text: string): TemplateLogicBlock[] {
  return text ? [{ type: "text", text }] : [];
}

function pushTextBlock(blocks: TemplateLogicBlock[], text: string) {
  if (!text) return;

  const last = blocks[blocks.length - 1];
  if (last?.type === "text") {
    last.text += text;
    return;
  }

  blocks.push({ type: "text", text });
}

function appendBlocks(target: TemplateLogicBlock[], incoming: TemplateLogicBlock[]) {
  for (const block of incoming) {
    if (block.type === "text") {
      pushTextBlock(target, block.text);
      continue;
    }

    target.push(block);
  }
}

function appendParagraphBreak(blocks: TemplateLogicBlock[]) {
  if (blocks.length === 0) {
    blocks.push({ type: "text", text: "\n" });
    return;
  }

  const last = blocks[blocks.length - 1];
  if (last.type === "text") {
    if (!last.text.endsWith("\n")) {
      last.text += "\n";
    }
    return;
  }

  blocks.push({ type: "text", text: "\n" });
}

function appendBlockSeparator(blocks: TemplateLogicBlock[]) {
  if (blocks.length === 0) return;

  const last = blocks[blocks.length - 1];
  if (last.type === "text") {
    if (!last.text.endsWith("\n")) {
      last.text += "\n";
    }
    return;
  }

  blocks.push({ type: "text", text: "\n" });
}

function parsePlateNode(node: unknown, warnings: string[]): TemplateLogicBlock[] {
  if (isPlateTextNode(node)) {
    return node.text.length > 0 ? [{ type: "text", text: node.text }] : [];
  }

  if (!isPlateElementNode(node)) {
    return [];
  }

  const customBlock = parseCustomTemplateNode(node, warnings);
  if (customBlock) {
    return [customBlock];
  }

  if (node.type.startsWith("template_")) {
    warnings.push(`Skipped unknown template node type: ${node.type}`);
    return [];
  }

  const children = Array.isArray(node.children) ? node.children : [];
  if (PARAGRAPH_LIKE_NODE_TYPES.has(node.type)) {
    const inlineBlocks = parseInlineNodes(children, warnings);
    appendParagraphBreak(inlineBlocks);
    return inlineBlocks;
  }

  return parsePlateNodes(children, warnings);
}

function parsePlateNodes(nodes: unknown[], warnings: string[]): TemplateLogicBlock[] {
  const blocks: TemplateLogicBlock[] = [];

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    appendBlocks(blocks, parsePlateNode(node, warnings));

    if (!isPlateElementNode(node)) {
      continue;
    }

    if (!STANDALONE_TEMPLATE_NODE_TYPES.has(node.type)) {
      continue;
    }

    if (index >= nodes.length - 1) {
      continue;
    }

    appendBlockSeparator(blocks);
  }

  return blocks;
}

function parseNestedBlocks(value: unknown, warnings: string[]): TemplateLogicBlock[] {
  if (!Array.isArray(value)) return [];

  const directParse = parseTemplateLogicBlocks(value as TemplateBlocks);
  if (directParse.success) {
    return directParse.data;
  }

  return parsePlateNodes(value, warnings);
}

function parseSwitchCases(
  value: unknown,
  warnings: string[],
): Array<{ equals: TemplatePrimitive; blocks: TemplateLogicBlock[] }> {
  if (!Array.isArray(value)) return [];

  const cases: Array<{ equals: TemplatePrimitive; blocks: TemplateLogicBlock[] }> = [];

  for (const item of value) {
    if (!isRecord(item)) continue;

    const equals = asPrimitive(item.equals);
    if (equals === undefined) continue;

    const template = asString(item.template);
    const parsedNested = parseNestedBlocks(item.blocks, warnings);
    const blocks = parsedNested.length > 0 ? parsedNested : ensureBlocksFromText(template ?? "");

    cases.push({ equals, blocks });
  }

  return cases;
}

function parseCustomTemplateNode(
  node: PlateElementNode,
  warnings: string[],
): TemplateLogicBlock | null {
  switch (node.type) {
    case "template_text": {
      return {
        type: "text",
        text: asString(node.text) ?? "",
      };
    }

    case "variable": {
      const path = asString(node.fieldPath);
      if (!path) return null;

      return {
        type: "variable",
        path,
        valueType: node.fieldType === "IMAGE" ? "image" : "text",
      };
    }

    case "template_conditional": {
      const path = asString(node.fieldPath) ?? asString(node.path);
      if (!path) return null;

      const thenNested = parseNestedBlocks(node.thenBlocks, warnings);
      const elseNested = parseNestedBlocks(node.elseBlocks, warnings);

      const thenBlocks =
        thenNested.length > 0
          ? thenNested
          : ensureBlocksFromText(asString(node.thenTemplate) ?? asString(node.thenText) ?? "");

      const elseBlocks =
        elseNested.length > 0
          ? elseNested
          : ensureBlocksFromText(asString(node.elseTemplate) ?? asString(node.elseText) ?? "");

      return {
        type: "conditional",
        condition: {
          path,
          operator: parseConditionOperator(node.operator),
          value: asPrimitive(node.value),
        },
        thenBlocks,
        elseBlocks: elseBlocks.length > 0 ? elseBlocks : undefined,
      };
    }

    case "template_list": {
      const sourcePath = asString(node.sourcePath);
      if (!sourcePath) return null;

      const nested = parseNestedBlocks(node.blocks, warnings);
      const listBlocks =
        nested.length > 0
          ? nested
          : ensureBlocksFromText(asString(node.itemTemplate) ?? "{{item}}\n");

      return {
        type: "list",
        sourcePath,
        itemAlias: asString(node.itemAlias) ?? "item",
        listStyle:
          node.listStyle === "bullet" || node.listStyle === "number" || node.listStyle === "none"
            ? node.listStyle
            : undefined,
        blocks: listBlocks,
        emptyText: asString(node.emptyText),
      };
    }

    case "template_switch": {
      const path = asString(node.fieldPath) ?? asString(node.path);
      if (!path) return null;

      const cases = parseSwitchCases(node.cases, warnings);
      if (cases.length === 0) return null;

      const defaultNested = parseNestedBlocks(node.defaultBlocks, warnings);
      const defaultBlocks =
        defaultNested.length > 0
          ? defaultNested
          : ensureBlocksFromText(asString(node.defaultTemplate) ?? "");

      return {
        type: "switch",
        path,
        cases,
        defaultBlocks: defaultBlocks.length > 0 ? defaultBlocks : undefined,
      };
    }

    case "template_ai": {
      const prompt = asString(node.promptTemplate) ?? asString(node.prompt);
      if (!prompt) return null;

      const rawCollectionContext = node.collectionContext;
      const collectionContext =
        isRecord(rawCollectionContext) &&
        typeof rawCollectionContext.id === "string" &&
        typeof rawCollectionContext.name === "string"
          ? {
              id: rawCollectionContext.id,
              name: rawCollectionContext.name,
              description:
                typeof rawCollectionContext.description === "string"
                  ? rawCollectionContext.description
                  : undefined,
            }
          : null;

      return {
        type: "ai",
        prompt,
        ...(collectionContext ? { collectionContext } : {}),
      };
    }

    default:
      return null;
  }
}

function parseInlineNodes(nodes: unknown[], warnings: string[]): TemplateLogicBlock[] {
  const blocks: TemplateLogicBlock[] = [];

  for (const node of nodes) {
    if (isPlateTextNode(node)) {
      pushTextBlock(blocks, node.text);
      continue;
    }

    if (!isPlateElementNode(node)) {
      continue;
    }

    const customBlock = parseCustomTemplateNode(node, warnings);
    if (customBlock) {
      blocks.push(customBlock);
      continue;
    }

    if (node.type.startsWith("template_")) {
      warnings.push(`Skipped unknown template node type: ${node.type}`);
      continue;
    }

    if (node.type === "a") {
      const url = asString(node.url);
      const linkText = extractNodeText(node);
      if (url && linkText.length > 0) {
        pushTextBlock(blocks, `[${linkText}](${url})`);
        continue;
      }
    }

    const children = Array.isArray(node.children) ? node.children : [];
    appendBlocks(blocks, parseInlineNodes(children, warnings));
  }

  return blocks;
}

export function parseTemplateBlocksToLogic(rawBlocks: TemplateBlocks): ParseTemplateBlocksResult {
  const directParse = parseTemplateLogicBlocks(rawBlocks);
  if (directParse.success) {
    return {
      blocks: directParse.data,
      warnings: [],
    };
  }

  const warnings: string[] = [];
  const blocks = parsePlateNodes(rawBlocks, warnings);

  return { blocks, warnings };
}
