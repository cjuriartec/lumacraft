export type SupportedDocumentFontFamily = "arial" | "roboto" | "times" | "courier";

export type DocumentRenderTarget = "web" | "pdf";

type DocumentBlockType = "p" | "blockquote" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface DocumentFontFamilyDefinition {
  label: string;
  pdf: string;
  web: string;
}

interface DocumentSpacingDefinition {
  pdfMarginBottom: number;
  pdfMarginTop: number;
}

export const DEFAULT_DOCUMENT_FONT_FAMILY: SupportedDocumentFontFamily = "arial";
export const DEFAULT_DOCUMENT_FONT_SIZE = 16;
export const DEFAULT_DOCUMENT_LINE_HEIGHT = 1.5;

export const DOCUMENT_BLOCK_FONT_SIZES: Record<DocumentBlockType, number> = {
  p: 16,
  blockquote: 16,
  h1: 36,
  h2: 24,
  h3: 20,
  h4: 18,
  h5: 18,
  h6: 16,
};

const DOCUMENT_FONT_FAMILY_DEFINITIONS: Record<
  SupportedDocumentFontFamily,
  DocumentFontFamilyDefinition
> = {
  arial: {
    label: "Arial",
    pdf: "Helvetica",
    web: "Arial, Helvetica, sans-serif",
  },
  roboto: {
    label: "Roboto",
    pdf: "Roboto",
    web: '"Roboto", Arial, sans-serif',
  },
  times: {
    label: "Times New Roman",
    pdf: "Times-Roman",
    web: '"Times New Roman", Times, serif',
  },
  courier: {
    label: "Courier New",
    pdf: "Courier",
    web: '"Courier New", Courier, monospace',
  },
};

const DOCUMENT_BLOCK_SPACING: Record<DocumentBlockType, DocumentSpacingDefinition> = {
  p: {
    pdfMarginBottom: 8,
    pdfMarginTop: 0,
  },
  blockquote: {
    pdfMarginBottom: 8,
    pdfMarginTop: 8,
  },
  h1: {
    pdfMarginBottom: 14,
    pdfMarginTop: 24,
  },
  h2: {
    pdfMarginBottom: 12,
    pdfMarginTop: 20,
  },
  h3: {
    pdfMarginBottom: 10,
    pdfMarginTop: 16,
  },
  h4: {
    pdfMarginBottom: 8,
    pdfMarginTop: 14,
  },
  h5: {
    pdfMarginBottom: 8,
    pdfMarginTop: 12,
  },
  h6: {
    pdfMarginBottom: 6,
    pdfMarginTop: 10,
  },
};

export const DOCUMENT_FONT_FAMILY_OPTIONS = (
  Object.entries(DOCUMENT_FONT_FAMILY_DEFINITIONS) as Array<
    [SupportedDocumentFontFamily, DocumentFontFamilyDefinition]
  >
).map(([value, definition]) => ({
  label: definition.label,
  value,
}));

function sanitizeFontFamilyValue(value: string): string {
  return value.trim().toLowerCase().replace(/["']/g, "");
}

function resolveDocumentBlockType(value: unknown): DocumentBlockType {
  if (
    value === "p" ||
    value === "blockquote" ||
    value === "h1" ||
    value === "h2" ||
    value === "h3" ||
    value === "h4" ||
    value === "h5" ||
    value === "h6"
  ) {
    return value;
  }

  return "p";
}

export function normalizeSupportedDocumentFontFamily(value: unknown): SupportedDocumentFontFamily {
  if (typeof value !== "string" || value.trim().length === 0) {
    return DEFAULT_DOCUMENT_FONT_FAMILY;
  }

  const normalized = sanitizeFontFamilyValue(value);

  if (normalized.includes("arial") || normalized.includes("helvetica")) {
    return "arial";
  }

  if (normalized.includes("times")) {
    return "times";
  }

  if (normalized.includes("roboto")) {
    return "roboto";
  }

  if (normalized.includes("courier") || normalized.includes("mono")) {
    return "courier";
  }

  if (
    normalized === "arial" ||
    normalized === "roboto" ||
    normalized === "times" ||
    normalized === "courier"
  ) {
    return normalized;
  }

  return DEFAULT_DOCUMENT_FONT_FAMILY;
}

export function resolveDocumentFontFamily(target: DocumentRenderTarget, value: unknown): string {
  const key = normalizeSupportedDocumentFontFamily(value);
  return DOCUMENT_FONT_FAMILY_DEFINITIONS[key][target];
}

export function resolveDocumentFontSize(value: unknown, blockType?: unknown): number {
  const fallback = DOCUMENT_BLOCK_FONT_SIZES[resolveDocumentBlockType(blockType)];
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(96, Math.max(8, parsed));
}

export function resolveDocumentLineHeight(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;

  if (!Number.isFinite(parsed)) {
    return DEFAULT_DOCUMENT_LINE_HEIGHT;
  }

  return Math.min(3, Math.max(1, parsed));
}

export function resolvePdfBlockSpacing(blockType?: unknown): DocumentSpacingDefinition {
  return DOCUMENT_BLOCK_SPACING[resolveDocumentBlockType(blockType)];
}
