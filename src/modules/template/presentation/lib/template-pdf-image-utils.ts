import type { TemplateAssetUrlResolverPort } from "../../application/ports/template-asset-url-resolver.port";
import type { TemplateBlocks } from "../../domain/types/template-blocks";

const ABSOLUTE_PDF_IMAGE_URL_PATTERN = /^(https?:\/\/|data:)/i;
const CSS_PX_TO_PDF_PT = 72 / 96;
const PDF_IMAGE_WIDTH_PT_MAX = 451;

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPdfImageNode(value: Record<string, unknown>): boolean {
  return value.type === "img" || value.type === "image";
}

export function isAbsolutePdfImageUrl(value: unknown): value is string {
  return typeof value === "string" && ABSOLUTE_PDF_IMAGE_URL_PATTERN.test(value.trim());
}

export function resolvePdfImageWidthPercent(element: Record<string, unknown>): number | undefined {
  const widthPercentCandidates = [element.imageWidthPercent, element.widthPercent, element.width];

  for (const candidate of widthPercentCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      if (candidate === element.width) {
        continue;
      }
      return clampNumber(candidate, 1, 100);
    }

    if (typeof candidate === "string" && candidate.trim().endsWith("%")) {
      const parsed = Number(candidate.replace("%", "").trim());
      if (Number.isFinite(parsed)) {
        return clampNumber(parsed, 1, 100);
      }
    }
  }

  return undefined;
}

export function resolvePdfImageHeightPx(element: Record<string, unknown>): number | undefined {
  const heightCandidates = [element.imageHeightPx, element.height];

  for (const candidate of heightCandidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return clampNumber(candidate * CSS_PX_TO_PDF_PT, 36, 900);
    }

    if (typeof candidate === "string" && candidate.trim().endsWith("px")) {
      const parsed = Number(candidate.replace("px", "").trim());
      if (Number.isFinite(parsed)) {
        return clampNumber(parsed * CSS_PX_TO_PDF_PT, 36, 900);
      }
    }
  }

  return undefined;
}

export function resolvePdfImageLayout(element: Record<string, unknown>): {
  heightPx?: number;
  widthPoints?: number;
  widthPercent?: number;
} {
  const numericWidth =
    typeof element.width === "number" && Number.isFinite(element.width)
      ? Math.max(24, Math.min(PDF_IMAGE_WIDTH_PT_MAX, element.width * CSS_PX_TO_PDF_PT))
      : undefined;

  return {
    heightPx: resolvePdfImageHeightPx(element),
    widthPoints: numericWidth,
    widthPercent: resolvePdfImageWidthPercent(element),
  };
}

export function resolvePdfImageSource(element: Record<string, unknown>): string | null {
  const url = asTrimmedString(element.url);
  if (url) {
    return url;
  }

  return asTrimmedString(element.path);
}

async function normalizePdfImageNodeSource(
  node: Record<string, unknown>,
  resolver: Pick<TemplateAssetUrlResolverPort, "resolveImageUrl">,
): Promise<Record<string, unknown>> {
  if (!isPdfImageNode(node)) {
    return node;
  }

  const bucket = asTrimmedString(node.bucket);
  const path = asTrimmedString(node.path);
  const url = asTrimmedString(node.url);

  if (bucket && path && !isAbsolutePdfImageUrl(path)) {
    const resolvedUrl = await resolver.resolveImageUrl({ bucket, path });
    if (resolvedUrl.ok) {
      return {
        ...node,
        url: resolvedUrl.value,
      };
    }

    return node;
  }

  if (isAbsolutePdfImageUrl(url)) {
    return {
      ...node,
      url,
    };
  }

  if (isAbsolutePdfImageUrl(path)) {
    return {
      ...node,
      url: path,
    };
  }

  return node;
}

async function normalizePdfImageNode(
  value: unknown,
  resolver: Pick<TemplateAssetUrlResolverPort, "resolveImageUrl">,
): Promise<unknown> {
  if (Array.isArray(value)) {
    const normalizedItems: unknown[] = [];

    for (const item of value) {
      normalizedItems.push(await normalizePdfImageNode(item, resolver));
    }

    return normalizedItems;
  }

  if (!isRecord(value)) {
    return value;
  }

  let normalizedNode = await normalizePdfImageNodeSource({ ...value }, resolver);

  if (Array.isArray(normalizedNode.children)) {
    normalizedNode = {
      ...normalizedNode,
      children: (await normalizePdfImageNode(normalizedNode.children, resolver)) as unknown[],
    };
  }

  return normalizedNode;
}

export async function normalizePdfImageSources(
  blocks: TemplateBlocks,
  resolver: Pick<TemplateAssetUrlResolverPort, "resolveImageUrl">,
): Promise<TemplateBlocks> {
  if (!Array.isArray(blocks)) {
    return blocks;
  }

  return (await normalizePdfImageNode(blocks, resolver)) as TemplateBlocks;
}
