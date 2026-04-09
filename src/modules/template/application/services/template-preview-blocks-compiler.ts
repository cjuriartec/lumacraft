import { z } from "zod";

import { buildGroundedPrompt } from "@/modules/ai/application/services/prompt-builder";
import { AIProviderFactoryPort } from "@/modules/ai/domain/ports/ai-provider-factory.port";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

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

interface CompileTemplatePreviewBlocksParams {
  requestId: string;
  blocks: TemplateBlocks;
  context: TemplateRuntimeContext;
  aiProviderFactory: AIProviderFactoryPort;
  aiSystemInstruction?: string;
  assetUrlResolver?: TemplateAssetUrlResolverPort;
  onEvent?: (event: TemplatePreviewEvent) => void;
  enableAI?: boolean;
  enableLogic?: boolean;
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
  aiSystemInstruction?: string;
  assetUrlResolver?: TemplateAssetUrlResolverPort;
  imageUrlCache: Map<string, string>;
  onEvent?: (event: TemplatePreviewEvent) => void;
  enableAI: boolean;
  enableLogic: boolean;
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

function toPlateText(
  text: string,
  marks?: { bold?: boolean; italic?: boolean; color?: string },
): PlateTextNode {
  return {
    text,
    bold: !!marks?.bold,
    italic: !!marks?.italic,
    color: marks?.color,
  };
}

function toParagraph(
  text: string,
  options?: {
    align?: string;
    lineHeight?: number;
    indent?: number;
    marks?: { bold?: boolean; italic?: boolean; color?: string };
  },
): PlateElementNode {
  return {
    type: "p",
    ...(options?.align ? { align: options.align } : {}),
    ...(options?.lineHeight ? { lineHeight: options.lineHeight } : {}),
    ...(options?.indent ? { indent: options.indent } : {}),
    children: [toPlateText(text, options?.marks)],
  };
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
  options?: { align?: string; lineHeight?: number; indent?: number },
): Promise<PlateElementNode> {
  const trimmed = line.trim();
  const align = options?.align ?? "left";
  const lineHeight = options?.lineHeight;
  const baseIndent = options?.indent ?? 0;

  if (trimmed.length === 0) return toParagraph("", { align, lineHeight });

  const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
  if (headingMatch) {
    const level = Math.min(3, Math.max(1, headingMatch[1].length));
    return {
      type: `h${level}`,
      ...(align !== "left" ? { align } : {}),
      ...(lineHeight ? { lineHeight } : {}),
      ...(baseIndent > 0 ? { indent: baseIndent } : {}),
      children: [toPlateText(headingMatch[2])],
    };
  }
  const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmed);
  if (unorderedMatch) {
    return {
      type: "p",
      align,
      ...(lineHeight ? { lineHeight } : {}),
      listStyleType: "disc",
      indent: baseIndent + 1,
      children: [toPlateText(unorderedMatch[1])],
    };
  }
  const orderedMatch = /^\d+\.\s+(.+)$/.exec(trimmed);
  if (orderedMatch) {
    return {
      type: "p",
      align,
      ...(lineHeight ? { lineHeight } : {}),
      listStyleType: "decimal",
      indent: baseIndent + 1,
      children: [toPlateText(orderedMatch[1])],
    };
  }
  const quoteMatch = /^>\s+(.+)$/.exec(trimmed);
  if (quoteMatch) {
    return {
      type: "blockquote",
      align,
      ...(lineHeight ? { lineHeight } : {}),
      ...(baseIndent > 0 ? { indent: baseIndent } : {}),
      children: [toPlateText(quoteMatch[1])],
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
  return toParagraph(trimmed, { align, lineHeight });
}

async function renderTemplateToBlocks(
  template: string,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  options?: { align?: string; lineHeight?: number; indent?: number },
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
  options?: { align?: string; lineHeight?: number; indent?: number },
): Promise<PlateElementNode[]> {
  const align = options?.align ?? "left";
  const lineHeight = options?.lineHeight;
  const baseIndent = options?.indent ?? 0;

  switch (block.type) {
    case "paragraph":
      return [toParagraph(block.text, { align, lineHeight })];
    case "heading":
      return [
        {
          type: `h${Math.min(3, Math.max(1, block.level ?? 2))}`,
          ...(align !== "left" ? { align } : {}),
          ...(lineHeight ? { lineHeight } : {}),
          ...(baseIndent > 0 ? { indent: baseIndent } : {}),
          children: [toPlateText(block.text)],
        },
      ];
    case "quote":
      return [
        {
          type: "blockquote",
          align,
          ...(lineHeight ? { lineHeight } : {}),
          ...(baseIndent > 0 ? { indent: baseIndent } : {}),
          children: [toPlateText(block.text)],
        },
      ];
    case "bullet_list":
      return block.items.map((item) => ({
        type: "p",
        align,
        ...(lineHeight ? { lineHeight } : {}),
        listStyleType: "disc",
        indent: baseIndent + 1,
        children: [toPlateText(item)],
      }));
    case "ordered_list":
      return block.items.map((item) => ({
        type: "p",
        align,
        ...(lineHeight ? { lineHeight } : {}),
        listStyleType: "decimal",
        indent: baseIndent + 1,
        children: [toPlateText(item)],
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
  options?: { align?: string; lineHeight?: number; indent?: number },
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

async function compileStructuredSubtreeBlocks(
  blocks: TemplateBlocks,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
): Promise<PlateElementNode[]> {
  const compiled: PlateElementNode[] = [];

  for (const block of blocks) {
    if (!isElementNode(block)) {
      continue;
    }

    compiled.push(...(await compileNode(block, scope, compileContext, warnings, blockMeta)));
  }

  return compiled;
}

async function compileTemplateAiNodeStreamed(
  node: PlateElementNode,
  scope: TemplateRuntimeScope,
  compileContext: CompileContext,
  warnings: string[],
  blockMeta: TemplatePreviewBlockMeta,
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

  const providerResult = compileContext.aiProviderFactory.create();
  if (!providerResult.ok) {
    warnings.push(providerResult.error.message);
    return [toParagraph(`AI no disponible: ${providerResult.error.message}`, { align: "justify" })];
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
    groundingContext: groundedPrompt.contextSnapshot,
    metadata: {
      usedPaths: groundedPrompt.usedPaths,
      fieldMetadataSnapshot: groundedPrompt.metadataSnapshot,
    },
    responseFormat: {
      mimeType: "application/json" as const,
      schema: AI_DOCUMENT_RESPONSE_SCHEMA,
    },
  };

  let aiText = "";
  let streamError: DomainError | null = null;

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
    warnings.push(streamError.message);
    return [
      toParagraph(`AI error: ${streamError.message}`, {
        align: typeof node.align === "string" ? node.align : undefined,
        lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
      }),
    ];
  }

  if (streamError) {
    warnings.push(`${streamError.message}. Se mostrara el contenido parcial recibido.`);
  }

  const structuredBlocks = await parseStructuredAIDocument(aiText, compileContext, warnings, {
    align: typeof node.align === "string" ? node.align : undefined,
    lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
    indent: typeof node.indent === "number" ? node.indent : undefined,
  });
  if (structuredBlocks && structuredBlocks.length > 0) {
    return structuredBlocks;
  }

  const lines = aiText ? aiText.split("\n") : [];
  const fallbackBlocks: PlateElementNode[] = [];
  for (const line of lines) {
    fallbackBlocks.push(
      await parseLineToBlock(line, compileContext, warnings, {
        align: typeof node.align === "string" ? node.align : undefined,
        lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
        indent: typeof node.indent === "number" ? node.indent : undefined,
      }),
    );
  }

  return fallbackBlocks.length > 0
    ? fallbackBlocks
    : [
        toParagraph("AI no devolvio contenido para este bloque.", {
          align: typeof node.align === "string" ? node.align : undefined,
          lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
        }),
      ];
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

  const compiledChildren: PlateDescendantNode[] = [];
  for (const child of node.children) {
    if (isTextNode(child)) {
      compiledChildren.push({
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
          bold: !!child.bold,
          italic: !!child.italic,
          color: typeof child.color === "string" ? child.color : undefined,
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
      );
      const aiText = aiBlocks
        .map((block) =>
          block.children
            .filter(isTextNode)
            .map((textNode) => textNode.text)
            .join(" "),
        )
        .join(" ")
        .trim();

      if (aiText.length > 0) {
        compiledChildren.push(toPlateText(aiText));
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
    );
  }

  return await renderTemplateToBlocks(selectedTemplate, scope, compileContext, warnings, {
    align: typeof node.align === "string" ? node.align : undefined,
    lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
    indent: typeof node.indent === "number" ? node.indent : undefined,
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
    );
  }

  return await renderTemplateToBlocks(selectedTemplate, scope, compileContext, warnings, {
    align: typeof node.align === "string" ? node.align : undefined,
    lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
    indent: typeof node.indent === "number" ? node.indent : undefined,
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
    });
  }

  const itemAlias =
    typeof node.itemAlias === "string" && node.itemAlias.length > 0 ? node.itemAlias : "item";
  const itemTemplate = typeof node.itemTemplate === "string" ? node.itemTemplate : "{{item}}";
  const listStyle = typeof node.listStyle === "string" ? node.listStyle : "none";
  const structuredBlocks = asTemplateBlocks(node.blocks);

  const blocks: PlateElementNode[] = [];
  for (let i = 0; i < sourceValue.length; i += 1) {
    const item = sourceValue[i];
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
          )
        : await renderTemplateToBlocks(itemTemplate, itemScope, compileContext, warnings, {
            align: typeof node.align === "string" ? node.align : undefined,
            lineHeight: typeof node.lineHeight === "number" ? node.lineHeight : undefined,
            indent: typeof node.indent === "number" ? node.indent : undefined,
          });

    if (listStyle === "bullet" || listStyle === "number") {
      itemBlocks.forEach((block, blockIndex) => {
        if (blockIndex === 0) {
          block.listStyleType = listStyle === "bullet" ? "disc" : "decimal";
          block.indent = 1;
        } else {
          block.indent = (typeof block.indent === "number" ? block.indent : 0) + 2;
        }
      });
    }

    blocks.push(...itemBlocks);
  }

  return blocks;
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
          marks: {
            bold: !!node.bold,
            italic: !!node.italic,
            color: typeof node.color === "string" ? node.color : undefined,
          },
        }),
      ];
    }
    default: {
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length === 0) {
        return [{ ...node, children: [toPlateText("")] }];
      }

      const compiledChildren: PlateDescendantNode[] = [];
      for (const child of children) {
        if (isTextNode(child)) {
          compiledChildren.push({
            ...child,
            text: interpolateTemplateString(child.text, scope),
          });
          continue;
        }

        if (!isElementNode(child)) {
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
  const result: PlateElementNode[] = [];
  const blockMetadata = getTemplatePreviewBlockMetadata(blocks);

  for (const blockMeta of blockMetadata) {
    emitPreviewEvent(compileContext, {
      type: "pending",
      requestId: compileContext.requestId,
      blockId: blockMeta.blockId,
      blockIndex: blockMeta.blockIndex,
      blockType: blockMeta.blockType,
    });

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
      continue;
    }

    const compiled = await compileNode(rawBlock, scope, compileContext, warnings, blockMeta);
    result.push(...compiled);

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
  }

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
      aiSystemInstruction: params.aiSystemInstruction,
      assetUrlResolver: params.assetUrlResolver,
      imageUrlCache: new Map<string, string>(),
      onEvent: params.onEvent,
      enableAI: params.enableAI ?? true,
      enableLogic: params.enableLogic ?? true,
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
