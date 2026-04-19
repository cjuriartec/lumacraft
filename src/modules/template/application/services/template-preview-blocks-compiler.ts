import { z } from "zod";

import { buildGroundedPrompt } from "@/modules/ai/application/services/prompt-builder";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import { TemplateAIBlockCachePort } from "@/modules/template/application/ports/template-ai-block-cache.port";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";
import { createAsyncLimiter, parallelMapLimit } from "@/shared/lib/async-limiter";
import {
  DEFAULT_DOCUMENT_FONT_FAMILY,
  normalizeSupportedDocumentFontFamily,
  resolveDocumentFontSize,
  resolveDocumentLineHeight,
} from "@/shared/lib/document-typography";
import { hashStableValue } from "@/shared/lib/stable-hash";

import {
  isTemplateBlocks,
  type JsonArray,
  type TemplateBlocks,
} from "../../domain/types/template-blocks";
import type {
  TemplateRuntimeContext,
  TemplateRuntimeScope,
} from "../../domain/types/template-runtime-context";
import type { TemplateAssetUrlResolverPort } from "../ports/template-asset-url-resolver.port";
import {
  applyTextTransform,
  interpolateTemplateString,
  isEmptyValue,
  resolveTemplatePath,
  stringifyTemplateValue,
} from "./template-path-resolver";
import { type TemplatePreviewEvent } from "./template-preview.types";
import {
  getTemplatePreviewBlockMetadata,
  type TemplatePreviewBlockMeta,
} from "./template-preview-block-metadata";

interface PlateTextNode {
  text: string;
  [key: string]: unknown;
}

interface PlateElementNode {
  type: string;
  children: Array<PlateElementNode | PlateTextNode>;
  [key: string]: unknown;
}

type PlateDescendantNode = PlateElementNode | PlateTextNode;

interface TemplateTextMarks {
  backgroundColor?: string;
  bold?: boolean;
  color?: string;
  fontFamily?: string;
  fontSize?: string | number;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
}

interface TemplateAiPresentationOptions {
  align?: string;
  lineHeight?: number;
  indent?: number;
  fontSize?: number;
  fontFamily?: string;
  spaceBefore?: number;
  spaceAfter?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface TemplateLogicPresentationOptions {
  align?: string;
  lineHeight?: number;
  indent?: number;
  fontSize?: number;
  fontFamily?: string;
  spaceBefore?: number;
  spaceAfter?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

interface CompileTemplatePreviewBlocksParams {
  requestId: string;
  blocks: TemplateBlocks;
  context: TemplateRuntimeContext;
  aiProviderFactory: AIProviderFactoryPort;
  accountId?: string;
  aiSettingsHash?: string;
  aiSystemInstruction?: string;
  assetUrlResolver?: TemplateAssetUrlResolverPort;
  aiBlockCache?: TemplateAIBlockCachePort;
  onEvent?: (event: TemplatePreviewEvent) => void;
  enableAI?: boolean;
  enableLogic?: boolean;
  emitPendingEvents?: boolean;
  maxCompileConcurrency?: number;
  maxAiConcurrency?: number;
  maxAssetConcurrency?: number;
  signal?: AbortSignal;
}

interface CompileTemplatePreviewBlocksResult {
  blocks: TemplateBlocks;
  warnings: string[];
}

interface CompileContext {
  requestId: string;
  context: TemplateRuntimeContext;
  aiProviderFactory: AIProviderFactoryPort;
  accountId?: string;
  aiSettingsHash?: string;
  aiSystemInstruction?: string;
  assetUrlResolver?: TemplateAssetUrlResolverPort;
  aiBlockCache?: TemplateAIBlockCachePort;
  imageUrlCache: Map<string, string>;
  imageUrlPromiseCache: Map<string, Promise<string>>;
  onEvent?: (event: TemplatePreviewEvent) => void;
  enableAI: boolean;
  enableLogic: boolean;
  emitPendingEvents: boolean;
  maxCompileConcurrency: number;
  aiLimiter: ReturnType<typeof createAsyncLimiter>;
  assetLimiter: ReturnType<typeof createAsyncLimiter>;
  signal?: AbortSignal;
}

type StructuredAIDocumentBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level?: number; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "image"; url: string; alt?: string };

const structuredAIDocumentSchema = z.object({
  blocks: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("paragraph"),
        text: z.string().min(1),
      }),
      z.object({
        type: z.literal("heading"),
        level: z.number().int().min(1).max(3).optional(),
        text: z.string().min(1),
      }),
      z.object({
        type: z.literal("bullet_list"),
        items: z.array(z.string().min(1)).min(1),
      }),
      z.object({
        type: z.literal("ordered_list"),
        items: z.array(z.string().min(1)).min(1),
      }),
      z.object({
        type: z.literal("quote"),
        text: z.string().min(1),
      }),
      z.object({
        type: z.literal("image"),
        url: z.string().min(1),
        alt: z.string().optional(),
      }),
    ]),
  ),
});

const AI_DOCUMENT_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["paragraph", "heading", "bullet_list", "ordered_list", "quote", "image"],
          },
          level: { type: "integer", minimum: 1, maximum: 3 },
          text: { type: "string" },
          items: {
            type: "array",
            items: { type: "string" },
          },
          url: { type: "string" },
          alt: { type: "string" },
        },
        required: ["type"],
      },
    },
  },
  required: ["blocks"],
};

const aiBlockInFlightCache = new Map<
  string,
  Promise<Result<{ blocks: TemplateBlocks; warnings: string[] }, DomainError>>
>();

const LOGIC_NODE_TYPES = new Set(["template_conditional", "template_list", "template_switch"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTextNode(value: unknown): value is PlateTextNode {
  return isRecord(value) && typeof value.text === "string";
}

function isElementNode(value: unknown): value is PlateElementNode {
  return isRecord(value) && typeof value.type === "string" && Array.isArray(value.children);
}

function toPlateText(text: string, marks?: TemplateTextMarks): PlateTextNode {
  return {
    text,
    ...(marks?.backgroundColor ? { backgroundColor: marks.backgroundColor } : {}),
    ...(marks?.bold ? { bold: true } : {}),
    ...(marks?.color ? { color: marks.color } : {}),
    ...(marks?.fontFamily ? { fontFamily: marks.fontFamily } : {}),
    ...(marks?.fontSize ? { fontSize: marks.fontSize } : {}),
    ...(marks?.italic ? { italic: true } : {}),
    ...(marks?.strikethrough ? { strikethrough: true } : {}),
    ...(marks?.underline ? { underline: true } : {}),
  };
}

function resolveFontSizeWithUnit(value: unknown, blockType: string): string | undefined {
  if (value === undefined || value === null) {
    return `${resolveDocumentFontSize(undefined, blockType)}pt`;
  }
  if (typeof value === "number") {
    return `${value}pt`;
  }
  if (typeof value === "string") {
    // If it already has a unit, respect it
    if (
      value.endsWith("px") ||
      value.endsWith("pt") ||
      value.endsWith("rem") ||
      value.endsWith("em")
    ) {
      return value;
    }
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return `${parsed}pt`;
    }
  }
  return `${resolveDocumentFontSize(value, blockType)}pt`;
}

function toParagraph(
  text: string,
  options?: {
    align?: string;
    lineHeight?: number;
    fontSize?: string | number;
    fontFamily?: string;
    indent?: number;
    spaceBefore?: number;
    spaceAfter?: number;
    marks?: TemplateTextMarks;
  },
): PlateElementNode {
  const resolvedFontSize = resolveFontSizeWithUnit(options?.fontSize, "p");
  const resolvedLineHeight = resolveDocumentLineHeight(options?.lineHeight);

  const inheritedMarks: TemplateTextMarks = {
    ...(options?.marks ?? {}),
    ...(resolvedFontSize ? { fontSize: resolvedFontSize } : {}),
    ...(options?.fontFamily ? { fontFamily: options.fontFamily } : {}),
  };

  return {
    type: "p",
    ...(options?.align ? { align: options.align } : {}),
    ...(resolvedLineHeight !== undefined ? { lineHeight: resolvedLineHeight } : {}),
    ...(options?.indent ? { indent: options.indent } : {}),
    ...(typeof options?.spaceBefore === "number" ? { spaceBefore: options.spaceBefore } : {}),
    ...(typeof options?.spaceAfter === "number" ? { spaceAfter: options.spaceAfter } : {}),
    ...(resolvedFontSize ? { fontSize: resolvedFontSize } : {}),
    ...(options?.fontFamily ? { fontFamily: options.fontFamily } : {}),
    children: parseInlineRichText(
      text,
      Object.keys(inheritedMarks).length > 0 ? inheritedMarks : undefined,
    ),
  };
}

function extractTextMarks(
  node: Record<string, unknown>,
  options?: {
    fallbackFontFamily?: string;
  },
): TemplateTextMarks {
  return {
    backgroundColor: typeof node.backgroundColor === "string" ? node.backgroundColor : undefined,
    bold: node.bold === true ? true : undefined,
    color: typeof node.color === "string" ? node.color : undefined,
    fontFamily:
      typeof node.fontFamily === "string"
        ? node.fontFamily
        : typeof options?.fallbackFontFamily === "string"
          ? options.fallbackFontFamily
          : undefined,
    fontSize:
      typeof node.fontSize === "string" || typeof node.fontSize === "number"
        ? node.fontSize
        : undefined,
    italic: node.italic === true ? true : undefined,
    strikethrough: node.strikethrough === true ? true : undefined,
    underline: node.underline === true ? true : undefined,
  };
}

function normalizeTextMarks(marks?: TemplateTextMarks): TemplateTextMarks | undefined {
  if (!marks) {
    return undefined;
  }

  const normalized: TemplateTextMarks = {
    ...marks,
    ...(typeof marks.fontSize === "number" ? { fontSize: `${marks.fontSize}pt` } : {}),
  };

  return Object.values(normalized).some((value) => value !== undefined) ? normalized : undefined;
}

function mergeTextMarks(
  base?: TemplateTextMarks,
  override?: TemplateTextMarks,
): TemplateTextMarks | undefined {
  return normalizeTextMarks({
    ...(base ?? {}),
    ...(override ?? {}),
  });
}

function isSafeLinkUrl(url: string): boolean {
  const trimmed = url.trim();

  return (
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed) ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  );
}

function parseInlineRichText(
  text: string,
  marks?: TemplateTextMarks,
): Array<PlateElementNode | PlateTextNode> {
  const inlineNodes: Array<PlateElementNode | PlateTextNode> = [];
  const markdownLinkPattern = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|\/|#)[^)]+)\)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(markdownLinkPattern)) {
    const start = match.index ?? 0;
    const [fullMatch, label, rawUrl] = match;
    const safeUrl = rawUrl.trim();

    if (start > lastIndex) {
      inlineNodes.push(toPlateText(text.slice(lastIndex, start), marks));
    }

    if (label && isSafeLinkUrl(safeUrl)) {
      inlineNodes.push({
        type: "a",
        url: safeUrl,
        children: [toPlateText(label, marks)],
      });
    } else {
      inlineNodes.push(toPlateText(fullMatch, marks));
    }

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < text.length) {
    inlineNodes.push(toPlateText(text.slice(lastIndex), marks));
  }

  return inlineNodes.length > 0 ? inlineNodes : [toPlateText(text, marks)];
}

function collectInlineDescendantNodes(
  node: PlateDescendantNode,
  fallbackMarks?: TemplateTextMarks,
): Array<PlateElementNode | PlateTextNode> {
  if (isTextNode(node)) {
    return parseInlineRichText(node.text, mergeTextMarks(fallbackMarks, extractTextMarks(node)));
  }

  if (!isElementNode(node)) {
    return [];
  }

  const nextFallbackMarks = mergeTextMarks(fallbackMarks, extractTextMarks(node));

  if (node.type === "a") {
    const linkChildren = node.children.flatMap((child) =>
      collectInlineDescendantNodes(child, nextFallbackMarks),
    );

    return [
      {
        ...node,
        children: linkChildren.filter(isTextNode).map((child) => ({ ...child })),
      },
    ];
  }

  return node.children.flatMap((child) => collectInlineDescendantNodes(child, nextFallbackMarks));
}

function flattenBlocksToInlineDescendants(
  blocks: PlateElementNode[],
  fallbackMarks?: TemplateTextMarks,
): Array<PlateElementNode | PlateTextNode> {
  const flattened: Array<PlateElementNode | PlateTextNode> = [];

  for (const block of blocks) {
    const textNodes = collectInlineDescendantNodes(block, fallbackMarks);

    if (textNodes.length === 0) {
      continue;
    }

    if (flattened.length > 0) {
      flattened.push(toPlateText(" "));
    }

    flattened.push(...textNodes);
  }

  return flattened;
}

function toImage(
  url: string,
  alt = "",
  options?: {
    bucket?: string;
    path?: string;
    widthPercent?: number;
    heightPx?: number;
    align?: "left" | "center" | "right" | "justify";
  },
): PlateElementNode {
  return {
    type: "img",
    url,
    ...(options?.bucket ? { bucket: options.bucket } : {}),
    ...(options?.path ? { path: options.path } : {}),
    ...(typeof options?.widthPercent === "number"
      ? {
          width: `${options.widthPercent}%`,
          widthPercent: options.widthPercent,
          imageWidthPercent: options.widthPercent,
        }
      : {}),
    ...(typeof options?.heightPx === "number"
      ? {
          height: options.heightPx,
          imageHeightPx: options.heightPx,
        }
      : {}),
    ...(options?.align ? { align: options.align } : {}),
    children: [toPlateText(alt)],
  };
}

function isComparableValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function evaluateCondition(operator: string | undefined, left: unknown, right: unknown): boolean {
  switch (operator) {
    case "equals":
      return left === right;
    case "not_equals":
      return left !== right;
    case "contains":
      if (typeof left === "string" && typeof right === "string") {
        return left.includes(right);
      }
      if (Array.isArray(left)) {
        return left.some((item) => item === right);
      }
      return false;
    case "gt":
      return isComparableValue(left) && isComparableValue(right) ? left > right : false;
    case "gte":
      return isComparableValue(left) && isComparableValue(right) ? left >= right : false;
    case "lt":
      return isComparableValue(left) && isComparableValue(right) ? left < right : false;
    case "lte":
      return isComparableValue(left) && isComparableValue(right) ? left <= right : false;
    case "is_empty":
      return isEmptyValue(left);
    case "not_empty":
      return !isEmptyValue(left);
    default:
      return left === right;
  }
}

function getSwitchTemplate(node: PlateElementNode, value: unknown): string {
  const cases = Array.isArray(node.cases) ? node.cases : [];
  for (const caseValue of cases) {
    if (!isRecord(caseValue)) continue;

    const equals = caseValue.equals;
    if (Object.is(value, equals)) {
      return typeof caseValue.template === "string" ? caseValue.template : "";
    }

    if (
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
      (typeof equals === "string" || typeof equals === "number" || typeof equals === "boolean") &&
      String(value) === String(equals)
    ) {
      return typeof caseValue.template === "string" ? caseValue.template : "";
    }
  }

  return typeof node.defaultTemplate === "string" ? node.defaultTemplate : "";
}

function isImageMetadata(value: unknown): value is {
  name?: string;
  path: string;
  bucket?: string;
  mimeType: string;
} {
  if (!isRecord(value)) return false;
  return (
    typeof value.path === "string" &&
    typeof value.mimeType === "string" &&
    value.mimeType.startsWith("image/")
  );
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function findImageMetadataInContext(
  path: string,
  context: Record<string, unknown>,
): { bucket?: string; name?: string } | null {
  const stack = [context];
  const seen = new Set<unknown>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (!isRecord(current) || seen.has(current)) continue;
    seen.add(current);

    if (
      current.path === path &&
      typeof current.mimeType === "string" &&
      current.mimeType.startsWith("image/")
    ) {
      return {
        bucket: typeof current.bucket === "string" ? current.bucket : undefined,
        name: typeof current.name === "string" ? current.name : undefined,
      };
    }

    for (const key in current) {
      const val = current[key];
      if (isRecord(val)) {
        stack.push(val);
      } else if (Array.isArray(val)) {
        for (const item of val) {
          if (isRecord(item)) stack.push(item);
        }
      }
    }
  }

  return null;
}

function readImageLayoutFromVariableNode(node: PlateElementNode): {
  widthPercent?: number;
  heightPx?: number;
  align?: "left" | "center" | "right" | "justify";
} {
  const widthRaw = node.imageWidthPercent;
  const heightRaw = node.imageHeightPx;

  const widthPercent = typeof widthRaw === "number" ? clampNumber(widthRaw, 0, 100) : undefined;
  const heightPx = typeof heightRaw === "number" ? clampNumber(heightRaw, 48, 1200) : undefined;
  const align =
    typeof node.align === "string" && ["left", "center", "right", "justify"].includes(node.align)
      ? (node.align as "left" | "center" | "right" | "justify")
      : undefined;

  return { widthPercent, heightPx, align };
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^data:/i.test(url);
}

function normalizeStorageUrl(path: string, bucket?: string): string {
  if (isAbsoluteUrl(path)) return path;

  if (path.startsWith("/")) {
    return path;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!bucket) return path;
  if (!baseUrl) {
    const encodedPath = path
      .split("/")
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join("/");

    return `/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
  }

  const normalizedBase = baseUrl.replace(/\/$/, "");
  const encodedPath = path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBase}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
}

async function resolveImageStorageUrl(
  path: string,
  bucket: string | undefined,
  compileContext: CompileContext,
  warnings: string[],
): Promise<string> {
  if (!bucket) {
    return normalizeStorageUrl(path, bucket);
  }

  const normalizedPath = path.trim();
  const normalizedBucket = bucket.trim();
  const cacheKey = `${normalizedBucket}:${normalizedPath}`;
  const cached = compileContext.imageUrlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = compileContext.imageUrlPromiseCache.get(cacheKey);
  if (pending) {
    return pending;
  }

  const resolution = compileContext.assetLimiter.run(async () => {
    if (compileContext.assetUrlResolver) {
      const signedUrlResult = await compileContext.assetUrlResolver.resolveImageUrl({
        bucket: normalizedBucket,
        path: normalizedPath,
      });
      if (signedUrlResult.ok) {
        compileContext.imageUrlCache.set(cacheKey, signedUrlResult.value);
        return signedUrlResult.value;
      }
      warnings.push(
        `No se pudo firmar URL de imagen (${normalizedBucket}/${normalizedPath}): ${signedUrlResult.error.message}`,
      );
    }

    const fallbackUrl = normalizeStorageUrl(normalizedPath, normalizedBucket);
    compileContext.imageUrlCache.set(cacheKey, fallbackUrl);
    return fallbackUrl;
  });

  compileContext.imageUrlPromiseCache.set(cacheKey, resolution);

  try {
    return await resolution;
  } finally {
    compileContext.imageUrlPromiseCache.delete(cacheKey);
  }
}

function resolveVariableText(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "";

    const primitiveValues = value.filter(
      (item): item is string | number | boolean =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean",
    );
    if (primitiveValues.length === value.length) {
      return primitiveValues.map(String).join(", ");
    }

    const namedValues = value
      .map((item) => {
        if (isRecord(item) && typeof item.name === "string") {
          return item.name;
        }
        return "";
      })
      .filter((item) => item.length > 0);

    if (namedValues.length > 0) {
      return namedValues.join(", ");
    }
  }

  return stringifyTemplateValue(value);
}

async function tryExtractSingleImageFromParagraph(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
): Promise<PlateElementNode | null> {
  const children = node.children ?? [];
  const meaningful = children.filter(
    (child) => !(isTextNode(child) && child.text.trim().length === 0),
  );
  if (meaningful.length !== 1) return null;

  const target = meaningful[0];
  if (!isElementNode(target) || target.type !== "variable") return null;

  const fieldPath = typeof target.fieldPath === "string" ? target.fieldPath : "";
  if (!fieldPath) return null;

  const value = resolveTemplatePath(scope, fieldPath);
  if (!isImageMetadata(value)) return null;
  const layout = readImageLayoutFromVariableNode(target);

  const imageUrl = await resolveImageStorageUrl(
    value.path,
    typeof value.bucket === "string" ? value.bucket : undefined,
    compileContext,
    warnings,
  );
  const alt = typeof value.name === "string" ? value.name : "image";
  return toImage(imageUrl, alt, {
    bucket: typeof value.bucket === "string" ? value.bucket : undefined,
    path: value.path,
    widthPercent: layout.widthPercent,
    heightPx: layout.heightPx,
    align: layout.align,
  });
}

async function parseLineToBlock(
  line: string,
  compileContext: CompileContext,
  warnings: string[],
  options?: {
    align?: string;
    lineHeight?: number;
    indent?: number;
    fontSize?: number;
    fontFamily?: string;
    spaceBefore?: number;
    spaceAfter?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  },
): Promise<PlateElementNode> {
  const trimmed = line.trim();
  const align = options?.align ?? "left";
  const lineHeight = options?.lineHeight;
  const baseIndent = options?.indent ?? 0;
  const fontSize = resolveFontSizeWithUnit(options?.fontSize, "p");
  const fontFamily = options?.fontFamily;
  const typographyMarks: TemplateTextMarks = {
    ...(fontSize ? { fontSize } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(options?.bold ? { bold: true } : {}),
    ...(options?.italic ? { italic: true } : {}),
    ...(options?.underline ? { underline: true } : {}),
  };
  const hasMarks = Object.keys(typographyMarks).length > 0;

  if (trimmed.length === 0)
    return toParagraph("", {
      align,
      lineHeight,
      fontSize: options?.fontSize,
      fontFamily,
      spaceBefore: options?.spaceBefore,
      spaceAfter: options?.spaceAfter,
      marks: hasMarks ? typographyMarks : undefined,
    });

  const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
  if (headingMatch) {
    const level = Math.min(3, Math.max(1, headingMatch[1].length));
    return {
      type: `h${level}`,
      ...(align !== "left" ? { align } : {}),
      ...(lineHeight ? { lineHeight } : {}),
      ...(baseIndent > 0 ? { indent: baseIndent } : {}),
      ...(fontSize ? { fontSize } : {}),
      ...(fontFamily ? { fontFamily } : {}),
      children: parseInlineRichText(headingMatch[2], hasMarks ? typographyMarks : undefined),
    };
  }
  const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmed);
  if (unorderedMatch) {
    return {
      type: "p",
      align,
      ...(lineHeight ? { lineHeight } : {}),
      ...(typeof options?.spaceBefore === "number" ? { spaceBefore: options.spaceBefore } : {}),
      ...(typeof options?.spaceAfter === "number" ? { spaceAfter: options.spaceAfter } : {}),
      ...(fontSize ? { fontSize } : {}),
      ...(fontFamily ? { fontFamily } : {}),
      listStyleType: "disc",
      indent: baseIndent + 1,
      children: parseInlineRichText(unorderedMatch[1], hasMarks ? typographyMarks : undefined),
    };
  }
  const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
  if (orderedMatch) {
    return {
      type: "p",
      align,
      ...(lineHeight ? { lineHeight } : {}),
      ...(typeof options?.spaceBefore === "number" ? { spaceBefore: options.spaceBefore } : {}),
      ...(typeof options?.spaceAfter === "number" ? { spaceAfter: options.spaceAfter } : {}),
      ...(fontSize ? { fontSize } : {}),
      ...(fontFamily ? { fontFamily } : {}),
      listStyleType: "decimal",
      indent: baseIndent + 1,
      children: parseInlineRichText(orderedMatch[1], hasMarks ? typographyMarks : undefined),
    };
  }
  const quoteMatch = /^>\s+(.+)$/.exec(trimmed);
  if (quoteMatch) {
    return {
      type: "blockquote",
      align,
      ...(lineHeight ? { lineHeight } : {}),
      ...(baseIndent > 0 ? { indent: baseIndent } : {}),
      ...(fontSize ? { fontSize } : {}),
      ...(fontFamily ? { fontFamily } : {}),
      children: parseInlineRichText(quoteMatch[1], hasMarks ? typographyMarks : undefined),
    };
  }
  const imageMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(trimmed);
  if (imageMatch) {
    const path = imageMatch[2];
    const metadata = findImageMetadataInContext(path, compileContext.context.root);
    const imageUrl = await resolveImageStorageUrl(path, metadata?.bucket, compileContext, warnings);
    return toImage(imageUrl, imageMatch[1] || metadata?.name || "image", {
      bucket: metadata?.bucket,
      path,
      align: align as "left" | "center" | "right" | "justify",
    });
  }
  return toParagraph(trimmed, {
    align,
    lineHeight,
    fontSize: options?.fontSize,
    fontFamily,
    spaceBefore: options?.spaceBefore,
    spaceAfter: options?.spaceAfter,
    marks: hasMarks ? typographyMarks : undefined,
  });
}

async function renderTemplateToBlocks(
  template: string,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  options?: {
    align?: string;
    lineHeight?: number;
    indent?: number;
    fontSize?: number;
    fontFamily?: string;
    spaceBefore?: number;
    spaceAfter?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  },
): Promise<PlateElementNode[]> {
  const rendered = interpolateTemplateString(template, scope);
  if (rendered.trim().length === 0) return [];

  const lines = rendered.split("\n");
  const blocks: PlateElementNode[] = [];
  for (const line of lines) {
    blocks.push(await parseLineToBlock(line, compileContext, warnings, options));
  }
  return blocks;
}

function extractJsonCandidate(raw: string): string | null {
  const fencedMatch = /```json\s*([\s\S]*?)```/i.exec(raw);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return null;
}

async function structuredBlockToPlate(
  block: StructuredAIDocumentBlock,
  compileContext: CompileContext,
  warnings: string[],
  options?: {
    align?: string;
    lineHeight?: number;
    indent?: number;
    fontSize?: number;
    fontFamily?: string;
    spaceBefore?: number;
    spaceAfter?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  },
): Promise<PlateElementNode[]> {
  const align = options?.align ?? "left";
  const lineHeight = options?.lineHeight;
  const baseIndent = options?.indent ?? 0;
  const fontSize = resolveFontSizeWithUnit(options?.fontSize, "p");
  const fontFamily = options?.fontFamily;
  const typographyMarks: TemplateTextMarks = {
    ...(fontSize ? { fontSize } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(options?.bold ? { bold: true } : {}),
    ...(options?.italic ? { italic: true } : {}),
    ...(options?.underline ? { underline: true } : {}),
  };
  const hasMarks = Object.keys(typographyMarks).length > 0;

  switch (block.type) {
    case "paragraph":
      return [
        toParagraph(block.text, {
          align,
          lineHeight,
          fontSize: options?.fontSize,
          fontFamily,
          spaceBefore: options?.spaceBefore,
          spaceAfter: options?.spaceAfter,
          marks: hasMarks ? typographyMarks : undefined,
        }),
      ];
    case "heading":
      return [
        {
          type: `h${Math.min(3, Math.max(1, block.level ?? 2))}`,
          ...(align !== "left" ? { align } : {}),
          ...(lineHeight ? { lineHeight } : {}),
          ...(baseIndent > 0 ? { indent: baseIndent } : {}),
          ...(fontSize ? { fontSize } : {}),
          ...(fontFamily ? { fontFamily } : {}),
          children: parseInlineRichText(block.text, hasMarks ? typographyMarks : undefined),
        },
      ];
    case "quote":
      return [
        {
          type: "blockquote",
          align,
          ...(lineHeight ? { lineHeight } : {}),
          ...(baseIndent > 0 ? { indent: baseIndent } : {}),
          ...(fontSize ? { fontSize } : {}),
          ...(fontFamily ? { fontFamily } : {}),
          children: parseInlineRichText(block.text, hasMarks ? typographyMarks : undefined),
        },
      ];
    case "bullet_list":
      return block.items.map((item) => ({
        type: "p",
        align,
        ...(lineHeight ? { lineHeight } : {}),
        ...(typeof options?.spaceBefore === "number" ? { spaceBefore: options.spaceBefore } : {}),
        ...(typeof options?.spaceAfter === "number" ? { spaceAfter: options.spaceAfter } : {}),
        ...(fontSize ? { fontSize } : {}),
        ...(fontFamily ? { fontFamily } : {}),
        listStyleType: "disc",
        indent: baseIndent + 1,
        children: parseInlineRichText(item, hasMarks ? typographyMarks : undefined),
      }));
    case "ordered_list":
      return block.items.map((item) => ({
        type: "p",
        align,
        ...(lineHeight ? { lineHeight } : {}),
        ...(typeof options?.spaceBefore === "number" ? { spaceBefore: options.spaceBefore } : {}),
        ...(typeof options?.spaceAfter === "number" ? { spaceAfter: options.spaceAfter } : {}),
        ...(fontSize ? { fontSize } : {}),
        ...(fontFamily ? { fontFamily } : {}),
        listStyleType: "decimal",
        indent: baseIndent + 1,
        children: parseInlineRichText(item, hasMarks ? typographyMarks : undefined),
      }));
    case "image": {
      const path = block.url;
      const metadata = findImageMetadataInContext(path, compileContext.context.root);
      const imageUrl = await resolveImageStorageUrl(
        path,
        metadata?.bucket,
        compileContext,
        warnings,
      );
      return [
        toImage(imageUrl, block.alt || metadata?.name || "image", {
          bucket: metadata?.bucket,
          path,
          align: align as "left" | "center" | "right" | "justify",
        }),
      ];
    }
    default:
      return [];
  }
}

async function parseStructuredAIDocument(
  raw: string,
  compileContext: CompileContext,
  warnings: string[],
  options?: {
    align?: string;
    lineHeight?: number;
    indent?: number;
    fontSize?: number;
    fontFamily?: string;
    spaceBefore?: number;
    spaceAfter?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  },
): Promise<PlateElementNode[] | null> {
  const candidate = extractJsonCandidate(raw);
  if (!candidate) return null;

  try {
    const parsed = JSON.parse(candidate) as unknown;
    const result = structuredAIDocumentSchema.safeParse(parsed);
    if (!result.success) return null;

    const blocks: PlateElementNode[] = [];
    for (const block of result.data.blocks) {
      blocks.push(...(await structuredBlockToPlate(block, compileContext, warnings, options)));
    }
    return blocks;
  } catch {
    return null;
  }
}

function toSerializableBlocks(blocks: PlateElementNode[]): Result<TemplateBlocks, DomainError> {
  const serializable = JSON.parse(JSON.stringify(blocks)) as JsonArray;
  if (!isTemplateBlocks(serializable)) {
    return fail(
      new DomainError(
        "Compiled preview blocks are not valid JSON template blocks",
        "TEMPLATE_COMPILE_ERROR",
      ),
    );
  }

  return ok(serializable);
}

function asTemplateBlocks(value: unknown): TemplateBlocks | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const serializable = JSON.parse(JSON.stringify(value)) as unknown;
  return isTemplateBlocks(serializable) ? serializable : null;
}

function resolveCollectionContext(
  compileContext: CompileContext,
  rawCollectionContext: unknown,
): { id: string; name: string; description?: string } | null {
  if (
    rawCollectionContext &&
    typeof rawCollectionContext === "object" &&
    typeof (rawCollectionContext as { id?: unknown }).id === "string" &&
    typeof (rawCollectionContext as { name?: unknown }).name === "string"
  ) {
    const collectionContext = rawCollectionContext as {
      id: string;
      name: string;
      description?: string;
    };

    return {
      id: collectionContext.id,
      name: collectionContext.name,
      ...(collectionContext.description ? { description: collectionContext.description } : {}),
    };
  }

  const { collectionId, collectionName, collectionDescription } = compileContext.context;
  if (!collectionId || !collectionName) {
    return null;
  }

  return {
    id: collectionId,
    name: collectionName,
    ...(collectionDescription ? { description: collectionDescription } : {}),
  };
}

function emitPreviewEvent(compileContext: CompileContext, event: TemplatePreviewEvent) {
  compileContext.onEvent?.(event);
}

function cloneSerializableBlocks(blocks: TemplateBlocks): PlateElementNode[] {
  return JSON.parse(JSON.stringify(blocks)) as PlateElementNode[];
}

async function persistAiBlockCache(
  compileContext: CompileContext,
  params: {
    cacheKey: string;
    providerId: string;
    model: string;
    blocks: TemplateBlocks;
    warnings: string[];
  },
) {
  if (!compileContext.aiBlockCache || !compileContext.accountId) {
    return;
  }

  await compileContext.aiBlockCache.save({
    cacheKey: params.cacheKey,
    accountId: compileContext.accountId,
    providerId: params.providerId,
    model: params.model,
    blocks: params.blocks,
    warnings: params.warnings,
  });
}

async function compileStructuredSubtreeBlocks(
  blocks: TemplateBlocks,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
  fallbackPresentation?: TemplateLogicPresentationOptions,
): Promise<PlateElementNode[]> {
  const compiledGroups = await parallelMapLimit(
    blocks,
    compileContext.maxCompileConcurrency,
    async (block) => {
      if (!isElementNode(block)) {
        return [];
      }

      return compileNode(
        applyPresentationFallbackToNode(block, fallbackPresentation),
        scope,
        compileContext,
        warnings,
        blockMeta,
      );
    },
  );

  return compiledGroups.flat();
}

function resolveTemplateAiPresentation(
  node: PlateElementNode,
  fallback?: TemplateAiPresentationOptions,
): TemplateAiPresentationOptions {
  return {
    align: typeof node.align === "string" ? node.align : fallback?.align,
    lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : fallback?.lineHeight,
    indent: typeof node.indent === "number" ? node.indent : fallback?.indent,
    fontSize: typeof node.fontSize === "number" ? node.fontSize : fallback?.fontSize,
    spaceBefore: typeof node.spaceBefore === "number" ? node.spaceBefore : fallback?.spaceBefore,
    spaceAfter: typeof node.spaceAfter === "number" ? node.spaceAfter : fallback?.spaceAfter,
    fontFamily:
      typeof node.fontFamily === "string"
        ? normalizeSupportedDocumentFontFamily(node.fontFamily)
        : typeof fallback?.fontFamily === "string"
          ? normalizeSupportedDocumentFontFamily(fallback.fontFamily)
          : DEFAULT_DOCUMENT_FONT_FAMILY,
    bold: node.bold === true ? true : fallback?.bold,
    italic: node.italic === true ? true : fallback?.italic,
    underline: node.underline === true ? true : fallback?.underline,
  };
}

function resolveTemplateLogicPresentation(
  node: PlateElementNode,
): TemplateLogicPresentationOptions {
  return {
    align: typeof node.align === "string" ? node.align : undefined,
    lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
    indent: typeof node.indent === "number" ? node.indent : undefined,
    fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
    spaceBefore: typeof node.spaceBefore === "number" ? node.spaceBefore : undefined,
    spaceAfter: typeof node.spaceAfter === "number" ? node.spaceAfter : undefined,
    fontFamily:
      typeof node.fontFamily === "string"
        ? normalizeSupportedDocumentFontFamily(node.fontFamily)
        : undefined,
    bold: node.bold === true ? true : undefined,
    italic: node.italic === true ? true : undefined,
    underline: node.underline === true ? true : undefined,
  };
}

function applyPresentationFallbackToTextNode(
  node: PlateTextNode,
  fallback?: TemplateLogicPresentationOptions,
): PlateTextNode {
  if (!fallback) {
    return node;
  }

  return {
    ...node,
    ...(node.fontSize === undefined && fallback.fontSize !== undefined
      ? { fontSize: resolveFontSizeWithUnit(fallback.fontSize, "p") }
      : {}),
    ...(node.fontFamily === undefined && fallback.fontFamily
      ? { fontFamily: fallback.fontFamily }
      : {}),
    ...(node.bold === undefined && fallback.bold !== undefined ? { bold: fallback.bold } : {}),
    ...(node.italic === undefined && fallback.italic !== undefined
      ? { italic: fallback.italic }
      : {}),
    ...(node.underline === undefined && fallback.underline !== undefined
      ? { underline: fallback.underline }
      : {}),
  };
}

function applyPresentationFallbackToNode(
  node: PlateElementNode,
  fallback?: TemplateLogicPresentationOptions,
): PlateElementNode {
  if (!fallback) {
    return node;
  }

  return {
    ...node,
    ...(node.align === undefined && fallback.align ? { align: fallback.align } : {}),
    ...(node.lineHeight === undefined && fallback.lineHeight !== undefined
      ? { lineHeight: resolveDocumentLineHeight(fallback.lineHeight) }
      : {}),
    ...(node.indent === undefined && fallback.indent !== undefined
      ? { indent: fallback.indent }
      : {}),
    ...(node.spaceBefore === undefined && fallback.spaceBefore !== undefined
      ? { spaceBefore: fallback.spaceBefore }
      : {}),
    ...(node.spaceAfter === undefined && fallback.spaceAfter !== undefined
      ? { spaceAfter: fallback.spaceAfter }
      : {}),
    ...(node.fontSize === undefined && fallback.fontSize !== undefined
      ? { fontSize: resolveFontSizeWithUnit(fallback.fontSize, node.type) }
      : {}),
    ...(node.fontFamily === undefined && fallback.fontFamily
      ? { fontFamily: fallback.fontFamily }
      : {}),
    ...(node.bold === undefined && fallback.bold !== undefined ? { bold: fallback.bold } : {}),
    ...(node.italic === undefined && fallback.italic !== undefined
      ? { italic: fallback.italic }
      : {}),
    ...(node.underline === undefined && fallback.underline !== undefined
      ? { underline: fallback.underline }
      : {}),
    ...(Array.isArray(node.children)
      ? {
          children: node.children.map((child) =>
            isElementNode(child)
              ? applyPresentationFallbackToNode(child, fallback)
              : isTextNode(child)
                ? applyPresentationFallbackToTextNode(child, fallback)
                : child,
          ),
        }
      : {}),
  };
}

async function compileTemplateAiNodeStreamed(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
  fallbackPresentation?: TemplateAiPresentationOptions,
): Promise<PlateElementNode[]> {
  const promptTemplate =
    typeof node.promptTemplate === "string"
      ? node.promptTemplate
      : typeof node.prompt === "string"
        ? node.prompt
        : "";

  if (!promptTemplate) {
    return [];
  }

  if (!compileContext.enableAI) {
    warnings.push("AI blocks were skipped because AI feature flag is disabled.");
    return [];
  }

  const requestedProvider =
    typeof node.provider === "string" && node.provider.length > 0
      ? (node.provider as "GEMINI" | "OPENAI" | "ANTHROPIC")
      : undefined;
  const providerResult = compileContext.aiProviderFactory.create(requestedProvider);
  if (!providerResult.ok) {
    warnings.push(providerResult.error.message);
    return [
      toParagraph(`AI no disponible: ${providerResult.error.message}`, {
        align: "justify",
        spaceBefore:
          typeof node.spaceBefore === "number"
            ? node.spaceBefore
            : fallbackPresentation?.spaceBefore,
        spaceAfter:
          typeof node.spaceAfter === "number" ? node.spaceAfter : fallbackPresentation?.spaceAfter,
      }),
    ];
  }

  const collectionContext = resolveCollectionContext(compileContext, node.collectionContext);

  const groundedPrompt = buildGroundedPrompt({
    promptTemplate,
    context: scope.root,
    locals: scope.locals,
    fieldMetadataByPath: compileContext.context.fieldMetadataByPath,
    systemInstruction: compileContext.aiSystemInstruction,
    collectionContext,
  });

  const request = {
    prompt: groundedPrompt.prompt,
    model: typeof node.model === "string" ? node.model : undefined,
    temperature: typeof node.temperature === "number" ? node.temperature : undefined,
    maxTokens: typeof node.maxTokens === "number" ? node.maxTokens : undefined,
    responseFormat: {
      mimeType: "application/json" as const,
      schema: AI_DOCUMENT_RESPONSE_SCHEMA,
    },
  };

  const presentation = resolveTemplateAiPresentation(node, fallbackPresentation);

  const aiCacheKey = hashStableValue({
    providerId: providerResult.value.id,
    requestedProvider,
    model: request.model ?? "default",
    temperature: request.temperature ?? "default",
    maxTokens: request.maxTokens ?? "default",
    prompt: request.prompt,
    responseFormat: request.responseFormat,
    aiSettingsHash: compileContext.aiSettingsHash ?? "default",
    presentation: {
      align: presentation.align ?? "default",
      lineHeight: presentation.lineHeight ?? "default",
      indent: presentation.indent ?? "default",
      fontSize: presentation.fontSize ?? "default",
      fontFamily: presentation.fontFamily ?? "default",
      spaceBefore: presentation.spaceBefore ?? "default",
      spaceAfter: presentation.spaceAfter ?? "default",
      bold: presentation.bold ?? "default",
      italic: presentation.italic ?? "default",
      underline: presentation.underline ?? "default",
    },
  });

  if (compileContext.aiBlockCache) {
    const cachedResult = await compileContext.aiBlockCache.findByKey(aiCacheKey);
    if (cachedResult.ok && cachedResult.value) {
      console.info(
        JSON.stringify({
          level: "info",
          requestId: compileContext.requestId,
          blockId: blockMeta.blockId,
          aiPromptMode: groundedPrompt.mode,
          usedPathCount: groundedPrompt.usedPaths.length,
          contextChars: groundedPrompt.contextSnapshot.length,
          metadataChars: groundedPrompt.metadataSnapshot.length,
          cacheHit: true,
        }),
      );
      warnings.push(...cachedResult.value.warnings);
      return cloneSerializableBlocks(cachedResult.value.blocks);
    }
  }

  let pendingCompilation = aiBlockInFlightCache.get(aiCacheKey);
  if (!pendingCompilation) {
    pendingCompilation = compileContext.aiLimiter.run(async () => {
      console.info(
        JSON.stringify({
          level: "info",
          requestId: compileContext.requestId,
          blockId: blockMeta.blockId,
          aiPromptMode: groundedPrompt.mode,
          usedPathCount: groundedPrompt.usedPaths.length,
          contextChars: groundedPrompt.contextSnapshot.length,
          metadataChars: groundedPrompt.metadataSnapshot.length,
          cacheHit: false,
        }),
      );
      let aiText = "";
      let streamError: DomainError | null = null;
      const aiWarnings: string[] = [];

      for await (const chunkResult of providerResult.value.stream(request, compileContext.signal)) {
        if (!chunkResult.ok) {
          streamError = chunkResult.error;
          break;
        }

        aiText += chunkResult.value.text;
        emitPreviewEvent(compileContext, {
          type: "ai_chunk",
          requestId: compileContext.requestId,
          blockId: blockMeta.blockId,
          blockIndex: blockMeta.blockIndex,
          blockType: blockMeta.blockType,
          text: chunkResult.value.text,
        });
      }

      if (streamError && aiText.trim().length === 0) {
        aiWarnings.push(streamError.message);
        const fallbackBlocks = [
          toParagraph(`AI error: ${streamError.message}`, {
            align: presentation.align,
            lineHeight: presentation.lineHeight,
            fontSize: presentation.fontSize,
            fontFamily: presentation.fontFamily,
            spaceBefore: presentation.spaceBefore,
            spaceAfter: presentation.spaceAfter,
          }),
        ];

        const serializedFallback = toSerializableBlocks(fallbackBlocks);
        if (!serializedFallback.ok) {
          return fail(serializedFallback.error);
        }

        await persistAiBlockCache(compileContext, {
          cacheKey: aiCacheKey,
          providerId: providerResult.value.id,
          model: request.model ?? "default",
          blocks: serializedFallback.value,
          warnings: aiWarnings,
        });

        return ok({
          blocks: serializedFallback.value,
          warnings: aiWarnings,
        });
      }

      if (streamError) {
        aiWarnings.push(`${streamError.message}. Se mostrara el contenido parcial recibido.`);
      }

      const parseWarnings = [...aiWarnings];
      const structuredBlocks = await parseStructuredAIDocument(
        aiText,
        compileContext,
        parseWarnings,
        {
          align: presentation.align,
          lineHeight: presentation.lineHeight,
          indent: presentation.indent,
          fontSize: presentation.fontSize,
          fontFamily: presentation.fontFamily,
          spaceBefore: presentation.spaceBefore,
          spaceAfter: presentation.spaceAfter,
          bold: presentation.bold,
          italic: presentation.italic,
          underline: presentation.underline,
        },
      );

      const finalBlocks =
        structuredBlocks && structuredBlocks.length > 0
          ? structuredBlocks
          : await Promise.all(
              (aiText ? aiText.split("\n") : []).map((line) =>
                parseLineToBlock(line, compileContext, parseWarnings, {
                  align: presentation.align,
                  lineHeight: presentation.lineHeight,
                  indent: presentation.indent,
                  fontSize: presentation.fontSize,
                  fontFamily: presentation.fontFamily,
                  spaceBefore: presentation.spaceBefore,
                  spaceAfter: presentation.spaceAfter,
                  bold: presentation.bold,
                  italic: presentation.italic,
                  underline: presentation.underline,
                }),
              ),
            );

      const normalizedBlocks =
        finalBlocks.length > 0
          ? finalBlocks
          : [
              toParagraph("AI no devolvio contenido para este bloque.", {
                align: presentation.align,
                lineHeight: presentation.lineHeight,
                fontSize: presentation.fontSize,
                fontFamily: presentation.fontFamily,
                spaceBefore: presentation.spaceBefore,
                spaceAfter: presentation.spaceAfter,
              }),
            ];

      const serializedBlocks = toSerializableBlocks(normalizedBlocks);
      if (!serializedBlocks.ok) {
        return fail(serializedBlocks.error);
      }

      await persistAiBlockCache(compileContext, {
        cacheKey: aiCacheKey,
        providerId: providerResult.value.id,
        model: request.model ?? "default",
        blocks: serializedBlocks.value,
        warnings: parseWarnings,
      });

      return ok({
        blocks: serializedBlocks.value,
        warnings: parseWarnings,
      });
    });

    aiBlockInFlightCache.set(aiCacheKey, pendingCompilation);
  }

  try {
    const compiledResult = await pendingCompilation;
    if (!compiledResult.ok) {
      warnings.push(compiledResult.error.message);
      return [
        toParagraph(`AI error: ${compiledResult.error.message}`, {
          align: presentation.align,
          lineHeight: presentation.lineHeight,
          fontSize: presentation.fontSize,
          fontFamily: presentation.fontFamily,
          spaceBefore: presentation.spaceBefore,
          spaceAfter: presentation.spaceAfter,
        }),
      ];
    }

    warnings.push(...compiledResult.value.warnings);
    return cloneSerializableBlocks(compiledResult.value.blocks);
  } finally {
    aiBlockInFlightCache.delete(aiCacheKey);
  }
}

async function compileParagraphNode(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
): Promise<PlateElementNode[]> {
  const singleImage = await tryExtractSingleImageFromParagraph(
    node,
    scope,
    compileContext,
    warnings,
  );
  if (singleImage) {
    return [singleImage];
  }

  const paragraphMarks = extractTextMarks(node);
  const compiledChildren: PlateDescendantNode[] = [];
  for (const child of node.children) {
    if (isTextNode(child)) {
      compiledChildren.push({
        ...paragraphMarks,
        ...child,
        text: interpolateTemplateString(child.text, scope),
      });
      continue;
    }

    if (!isElementNode(child)) {
      continue;
    }

    if (child.type === "variable") {
      const fieldPath = typeof child.fieldPath === "string" ? child.fieldPath : "";
      const value = fieldPath ? resolveTemplatePath(scope, fieldPath) : undefined;
      const rawText = resolveVariableText(value);
      const transform = typeof child.textTransform === "string" ? child.textTransform : undefined;
      const transformedText = applyTextTransform(rawText, transform);

      compiledChildren.push(
        toPlateText(transformedText, {
          ...mergeTextMarks(
            paragraphMarks,
            extractTextMarks(child, {
              fallbackFontFamily: typeof node.fontFamily === "string" ? node.fontFamily : undefined,
            }),
          ),
        }),
      );
      continue;
    }

    if (child.type === "template_ai") {
      const aiBlocks = await compileTemplateAiNodeStreamed(
        child,
        scope,
        compileContext,
        warnings,
        blockMeta,
        {
          align: typeof node.align === "string" ? node.align : undefined,
          lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
          indent: typeof node.indent === "number" ? node.indent : undefined,
          fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
          fontFamily: typeof node.fontFamily === "string" ? node.fontFamily : undefined,
          spaceBefore: typeof node.spaceBefore === "number" ? node.spaceBefore : undefined,
          spaceAfter: typeof node.spaceAfter === "number" ? node.spaceAfter : undefined,
        },
      );
      const inlineAiChildren = flattenBlocksToInlineDescendants(
        aiBlocks,
        mergeTextMarks(extractTextMarks(node), extractTextMarks(child)),
      );

      if (inlineAiChildren.length > 0) {
        compiledChildren.push(...inlineAiChildren);
      }
      continue;
    }

    const nestedBlocks = await compileNode(child, scope, compileContext, warnings, blockMeta);
    if (nestedBlocks.length === 1 && nestedBlocks[0].type === "p") {
      const onlyChildren = nestedBlocks[0].children.filter(isTextNode);
      for (const textChild of onlyChildren) {
        compiledChildren.push({ ...textChild });
      }
      continue;
    }

    if (nestedBlocks.length === 1 && nestedBlocks[0].type !== "p") {
      compiledChildren.push(nestedBlocks[0]);
      continue;
    }

    if (Array.isArray(child.children)) {
      const nestedChildren: PlateDescendantNode[] = [];
      for (const nestedChild of child.children) {
        if (isTextNode(nestedChild)) {
          nestedChildren.push({
            ...nestedChild,
            text: interpolateTemplateString(nestedChild.text, scope),
          });
        }
      }

      compiledChildren.push({
        ...child,
        children: nestedChildren.length > 0 ? nestedChildren : [toPlateText("")],
      });
    }
  }

  return [
    {
      ...node,
      align: typeof node.align === "string" ? node.align : "justify",
      children: compiledChildren.length > 0 ? compiledChildren : [toPlateText("")],
    },
  ];
}

async function compileTemplateConditionalNode(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
): Promise<PlateElementNode[]> {
  const fieldPath =
    typeof node.fieldPath === "string"
      ? node.fieldPath
      : typeof node.path === "string"
        ? node.path
        : "";

  if (!fieldPath) return [];

  const left = resolveTemplatePath(scope, fieldPath);
  const operator = typeof node.operator === "string" ? node.operator : "equals";
  const right = node.value;
  const matches = evaluateCondition(operator, left, right);

  emitPreviewEvent(compileContext, {
    type: "branch_selected",
    requestId: compileContext.requestId,
    blockId: blockMeta.blockId,
    blockIndex: blockMeta.blockIndex,
    blockType: blockMeta.blockType,
    branch: matches ? "then" : "else",
    path: fieldPath,
    matchedValue: stringifyTemplateValue(left),
  });
  const selectedTemplate = matches
    ? typeof node.thenTemplate === "string"
      ? node.thenTemplate
      : ""
    : typeof node.elseTemplate === "string"
      ? node.elseTemplate
      : "";
  const structuredBlocks = asTemplateBlocks(matches ? node.thenBlocks : node.elseBlocks);
  if (structuredBlocks !== null) {
    return await compileStructuredSubtreeBlocks(
      structuredBlocks,
      scope,
      compileContext,
      warnings,
      blockMeta,
      resolveTemplateLogicPresentation(node),
    );
  }

  return await renderTemplateToBlocks(selectedTemplate, scope, compileContext, warnings, {
    align: typeof node.align === "string" ? node.align : undefined,
    lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
    indent: typeof node.indent === "number" ? node.indent : undefined,
    fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
    fontFamily: typeof node.fontFamily === "string" ? node.fontFamily : undefined,
    bold: node.bold === true ? true : undefined,
    italic: node.italic === true ? true : undefined,
    underline: node.underline === true ? true : undefined,
  });
}

async function compileTemplateSwitchNode(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
): Promise<PlateElementNode[]> {
  const fieldPath =
    typeof node.fieldPath === "string"
      ? node.fieldPath
      : typeof node.path === "string"
        ? node.path
        : "";
  if (!fieldPath) return [];

  const value = resolveTemplatePath(scope, fieldPath);
  const selectedTemplate = getSwitchTemplate(node, value);
  const matchedCase = Array.isArray(node.cases)
    ? node.cases.find((switchCase) => {
        if (!isRecord(switchCase)) return false;

        if (Object.is(value, switchCase.equals)) {
          return true;
        }

        return (
          (typeof value === "string" || typeof value === "number" || typeof value === "boolean") &&
          (typeof switchCase.equals === "string" ||
            typeof switchCase.equals === "number" ||
            typeof switchCase.equals === "boolean") &&
          String(value) === String(switchCase.equals)
        );
      })
    : undefined;

  emitPreviewEvent(compileContext, {
    type: "branch_selected",
    requestId: compileContext.requestId,
    blockId: blockMeta.blockId,
    blockIndex: blockMeta.blockIndex,
    blockType: blockMeta.blockType,
    branch: matchedCase ? "case" : "default",
    path: fieldPath,
    matchedValue: stringifyTemplateValue(value),
  });
  const structuredBlocks =
    asTemplateBlocks(matchedCase && isRecord(matchedCase) ? matchedCase.blocks : undefined) ??
    (matchedCase ? null : asTemplateBlocks(node.defaultBlocks));

  if (structuredBlocks !== null) {
    return await compileStructuredSubtreeBlocks(
      structuredBlocks,
      scope,
      compileContext,
      warnings,
      blockMeta,
      resolveTemplateLogicPresentation(node),
    );
  }

  return await renderTemplateToBlocks(selectedTemplate, scope, compileContext, warnings, {
    align: typeof node.align === "string" ? node.align : undefined,
    lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
    indent: typeof node.indent === "number" ? node.indent : undefined,
    fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
    fontFamily: typeof node.fontFamily === "string" ? node.fontFamily : undefined,
    bold: node.bold === true ? true : undefined,
    italic: node.italic === true ? true : undefined,
    underline: node.underline === true ? true : undefined,
  });
}

async function compileTemplateListNode(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
): Promise<PlateElementNode[]> {
  const sourcePath = typeof node.sourcePath === "string" ? node.sourcePath : "";
  if (!sourcePath) return [];

  const sourceValue = resolveTemplatePath(scope, sourcePath);
  const count = Array.isArray(sourceValue) ? sourceValue.length : 0;

  emitPreviewEvent(compileContext, {
    type: "items_resolved",
    requestId: compileContext.requestId,
    blockId: blockMeta.blockId,
    blockIndex: blockMeta.blockIndex,
    blockType: blockMeta.blockType,
    sourcePath,
    count,
  });

  if (!Array.isArray(sourceValue) || sourceValue.length === 0) {
    const emptyText = typeof node.emptyText === "string" ? node.emptyText : "";
    return renderTemplateToBlocks(emptyText, scope, compileContext, warnings, {
      align: typeof node.align === "string" ? node.align : undefined,
      lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
      indent: typeof node.indent === "number" ? node.indent : undefined,
      fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
      fontFamily: typeof node.fontFamily === "string" ? node.fontFamily : undefined,
    });
  }

  const itemAlias =
    typeof node.itemAlias === "string" && node.itemAlias.length > 0 ? node.itemAlias : "item";
  const itemTemplate = typeof node.itemTemplate === "string" ? node.itemTemplate : "{{item}}";
  const listStyle = typeof node.listStyle === "string" ? node.listStyle : "none";
  const structuredBlocks = asTemplateBlocks(node.blocks);
  const presentation = resolveTemplateLogicPresentation(node);

  const compiledItems = await parallelMapLimit(
    sourceValue,
    compileContext.maxCompileConcurrency,
    async (item) => {
      const itemScope: TemplateRuntimeScope = {
        root: scope.root,
        locals: {
          ...scope.locals,
          [itemAlias]: item,
        },
      };

      const itemBlocks =
        structuredBlocks !== null
          ? await compileStructuredSubtreeBlocks(
              structuredBlocks,
              itemScope,
              compileContext,
              warnings,
              blockMeta,
              presentation,
            )
          : await renderTemplateToBlocks(itemTemplate, itemScope, compileContext, warnings, {
              align: presentation.align,
              lineHeight: presentation.lineHeight,
              indent: presentation.indent,
              fontSize: presentation.fontSize,
              fontFamily: presentation.fontFamily,
              bold: presentation.bold,
              italic: presentation.italic,
              underline: presentation.underline,
            });

      if (listStyle === "bullet" || listStyle === "number") {
        const baseIndent = presentation.indent ?? 0;
        itemBlocks.forEach((block, blockIndex) => {
          if (blockIndex === 0) {
            block.listStyleType = listStyle === "bullet" ? "disc" : "decimal";
            block.indent = baseIndent + 1;
          } else {
            block.indent = (typeof block.indent === "number" ? block.indent : 0) + 2;
          }
        });
      }

      return itemBlocks;
    },
  );

  return compiledItems.flat();
}

async function compileNode(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
): Promise<PlateElementNode[]> {
  if (LOGIC_NODE_TYPES.has(node.type) && !compileContext.enableLogic) {
    warnings.push(`Block "${node.type}" was skipped because logic feature flag is disabled.`);
    return [];
  }

  switch (node.type) {
    case "a": {
      const inlineChildren = (Array.isArray(node.children) ? node.children : [])
        .filter(isTextNode)
        .map((child) => ({
          ...child,
          text: interpolateTemplateString(child.text, scope),
        }));

      return [
        {
          ...node,
          children: inlineChildren.length > 0 ? inlineChildren : [toPlateText("")],
        },
      ];
    }
    case "template_conditional":
      return compileTemplateConditionalNode(node, scope, compileContext, warnings, blockMeta);
    case "template_switch":
      return compileTemplateSwitchNode(node, scope, compileContext, warnings, blockMeta);
    case "template_list":
      return compileTemplateListNode(node, scope, compileContext, warnings, blockMeta);
    case "template_ai":
      return compileTemplateAiNodeStreamed(node, scope, compileContext, warnings, blockMeta);
    case "p":
      return compileParagraphNode(node, scope, compileContext, warnings, blockMeta);
    case "variable": {
      const fieldPath = typeof node.fieldPath === "string" ? node.fieldPath : "";
      const value = fieldPath ? resolveTemplatePath(scope, fieldPath) : undefined;

      if (isImageMetadata(value)) {
        const layout = readImageLayoutFromVariableNode(node);
        const imageUrl = await resolveImageStorageUrl(
          value.path,
          typeof value.bucket === "string" ? value.bucket : undefined,
          compileContext,
          warnings,
        );
        const alt = typeof value.name === "string" ? value.name : "image";
        return [
          toImage(imageUrl, alt, {
            bucket: typeof value.bucket === "string" ? value.bucket : undefined,
            path: value.path,
            widthPercent: layout.widthPercent,
            heightPx: layout.heightPx,
          }),
        ];
      }

      const rawText = resolveVariableText(value);
      const transform = typeof node.textTransform === "string" ? node.textTransform : undefined;
      const transformedText = applyTextTransform(rawText, transform);

      return [
        toParagraph(transformedText, {
          align: typeof node.align === "string" ? node.align : "justify",
          lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
          indent: typeof node.indent === "number" ? node.indent : undefined,
          spaceBefore: typeof node.spaceBefore === "number" ? node.spaceBefore : undefined,
          spaceAfter: typeof node.spaceAfter === "number" ? node.spaceAfter : undefined,
          marks: extractTextMarks(node),
        }),
      ];
    }
    default: {
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length === 0) {
        return [{ ...node, children: [toPlateText("")] }];
      }

      const parentMarks = extractTextMarks(node);
      const compiledChildren: PlateDescendantNode[] = [];
      for (const child of children) {
        if (isTextNode(child)) {
          compiledChildren.push({
            ...parentMarks,
            ...child,
            text: interpolateTemplateString(child.text, scope),
          });
          continue;
        }

        if (!isElementNode(child)) {
          continue;
        }

        if (child.type === "variable") {
          const fieldPath = typeof child.fieldPath === "string" ? child.fieldPath : "";
          const value = fieldPath ? resolveTemplatePath(scope, fieldPath) : undefined;
          const rawText = resolveVariableText(value);
          const transform =
            typeof child.textTransform === "string" ? child.textTransform : undefined;
          const transformedText = applyTextTransform(rawText, transform);

          compiledChildren.push(
            toPlateText(transformedText, {
              ...mergeTextMarks(
                parentMarks,
                extractTextMarks(child, {
                  fallbackFontFamily:
                    typeof node.fontFamily === "string" ? node.fontFamily : undefined,
                }),
              ),
            }),
          );
          continue;
        }

        if (child.type === "template_ai") {
          const aiBlocks = await compileTemplateAiNodeStreamed(
            child,
            scope,
            compileContext,
            warnings,
            blockMeta,
            {
              align: typeof node.align === "string" ? node.align : undefined,
              lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
              indent: typeof node.indent === "number" ? node.indent : undefined,
              fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
              fontFamily: typeof node.fontFamily === "string" ? node.fontFamily : undefined,
              bold: node.bold === true ? true : undefined,
              italic: node.italic === true ? true : undefined,
              underline: node.underline === true ? true : undefined,
            },
          );

          if (node.type === "td" || node.type === "th") {
            compiledChildren.push(...aiBlocks);
            continue;
          }

          const inlineAiChildren = flattenBlocksToInlineDescendants(
            aiBlocks,
            mergeTextMarks(extractTextMarks(node), extractTextMarks(child)),
          );

          if (inlineAiChildren.length > 0) {
            compiledChildren.push(...inlineAiChildren);
          }
          continue;
        }

        const nested = await compileNode(child, scope, compileContext, warnings, blockMeta);
        compiledChildren.push(...nested);
      }

      return [
        {
          ...node,
          children: compiledChildren.length > 0 ? compiledChildren : [toPlateText("")],
        },
      ];
    }
  }
}

async function compileBlocks(
  blocks: TemplateBlocks,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
): Promise<Result<PlateElementNode[], DomainError>> {
  const blockMetadata = getTemplatePreviewBlockMetadata(blocks);
  const compiledGroups = await parallelMapLimit(
    blockMetadata,
    compileContext.maxCompileConcurrency,
    async (blockMeta) => {
      if (compileContext.emitPendingEvents) {
        emitPreviewEvent(compileContext, {
          type: "pending",
          requestId: compileContext.requestId,
          blockId: blockMeta.blockId,
          blockIndex: blockMeta.blockIndex,
          blockType: blockMeta.blockType,
        });
      }

      const rawBlock = blocks[blockMeta.blockIndex];
      if (!isElementNode(rawBlock)) {
        emitPreviewEvent(compileContext, {
          type: "resolved",
          requestId: compileContext.requestId,
          blockId: blockMeta.blockId,
          blockIndex: blockMeta.blockIndex,
          blockType: blockMeta.blockType,
          blocks: [],
        });

        return ok({
          blockIndex: blockMeta.blockIndex,
          compiled: [] as PlateElementNode[],
        });
      }

      const compiled = await compileNode(rawBlock, scope, compileContext, warnings, blockMeta);
      const serializableBlockResult = toSerializableBlocks(compiled);
      if (!serializableBlockResult.ok) {
        emitPreviewEvent(compileContext, {
          type: "error",
          requestId: compileContext.requestId,
          code: serializableBlockResult.error.code ?? "TEMPLATE_COMPILE_ERROR",
          message: serializableBlockResult.error.message,
          blockId: blockMeta.blockId,
          blockIndex: blockMeta.blockIndex,
          blockType: blockMeta.blockType,
        });

        return fail(serializableBlockResult.error);
      }

      emitPreviewEvent(compileContext, {
        type: "resolved",
        requestId: compileContext.requestId,
        blockId: blockMeta.blockId,
        blockIndex: blockMeta.blockIndex,
        blockType: blockMeta.blockType,
        blocks: serializableBlockResult.value,
      });

      return ok({
        blockIndex: blockMeta.blockIndex,
        compiled,
      });
    },
  );

  const result: PlateElementNode[] = [];
  for (const compiledGroup of compiledGroups) {
    if (!compiledGroup.ok) {
      return fail(compiledGroup.error);
    }
  }

  compiledGroups
    .map((group) => (group.ok ? group.value : null))
    .filter(
      (group): group is { blockIndex: number; compiled: PlateElementNode[] } => group !== null,
    )
    .sort((left, right) => left.blockIndex - right.blockIndex)
    .forEach((group) => {
      result.push(...group.compiled);
    });

  return ok(result);
}

export async function compileTemplatePreviewBlocks(
  params: CompileTemplatePreviewBlocksParams,
): Promise<Result<CompileTemplatePreviewBlocksResult, DomainError>> {
  const scope: TemplateRuntimeScope = {
    root: params.context.root,
    locals: {},
  };

  const warnings: string[] = [];
  const compiledBlocks = await compileBlocks(
    params.blocks,
    scope,
    {
      requestId: params.requestId,
      context: params.context,
      aiProviderFactory: params.aiProviderFactory,
      accountId: params.accountId,
      aiSettingsHash: params.aiSettingsHash,
      aiSystemInstruction: params.aiSystemInstruction,
      assetUrlResolver: params.assetUrlResolver,
      aiBlockCache: params.aiBlockCache,
      imageUrlCache: new Map<string, string>(),
      imageUrlPromiseCache: new Map<string, Promise<string>>(),
      onEvent: params.onEvent,
      enableAI: params.enableAI ?? true,
      enableLogic: params.enableLogic ?? true,
      emitPendingEvents: params.emitPendingEvents ?? true,
      maxCompileConcurrency: Math.max(1, params.maxCompileConcurrency ?? 4),
      aiLimiter: createAsyncLimiter(Math.max(1, params.maxAiConcurrency ?? 3)),
      assetLimiter: createAsyncLimiter(Math.max(1, params.maxAssetConcurrency ?? 6)),
      signal: params.signal,
    },
    warnings,
  );

  if (!compiledBlocks.ok) {
    return fail(compiledBlocks.error);
  }

  const serializable = JSON.parse(JSON.stringify(compiledBlocks.value)) as JsonArray;
  if (!isTemplateBlocks(serializable)) {
    return fail(
      new DomainError(
        "Compiled preview blocks are not valid JSON template blocks",
        "TEMPLATE_COMPILE_ERROR",
      ),
    );
  }

  return ok({
    blocks: serializable,
    warnings,
  });
}
