import type { JsonArray } from "./template-blocks";
import { isJsonValue } from "./template-blocks";

/**
 * Configuration for a single header or footer section in a PDF page.
 */
export interface PdfHeaderFooterSection {
  /** Whether this section is rendered in the PDF output. */
  enabled: boolean;
  /** Plate-serialised blocks — same format as the template body. */
  blocks: JsonArray;
  /** Height in pt.  Defaults: header 50, footer 40. */
  height?: number;
}

/**
 * Page-level PDF configuration stored alongside the template.
 *
 * Both `header` and `footer` are optional.  When absent or when `enabled`
 * is `false`, the corresponding section is omitted from the PDF.
 */
export interface PdfPageConfig {
  header?: PdfHeaderFooterSection;
  footer?: PdfHeaderFooterSection;
}

// ---------------------------------------------------------------------------
// Runtime guard
// ---------------------------------------------------------------------------

function isPdfHeaderFooterSection(value: unknown): value is PdfHeaderFooterSection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;

  if (typeof record.enabled !== "boolean") return false;
  if (!Array.isArray(record.blocks) || !record.blocks.every(isJsonValue)) return false;
  if (record.height !== undefined && typeof record.height !== "number") return false;

  return true;
}

export function isPdfPageConfig(value: unknown): value is PdfPageConfig {
  if (value === null || value === undefined) return true; // null / undefined → no config
  if (typeof value !== "object" || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;

  if (record.header !== undefined && !isPdfHeaderFooterSection(record.header)) return false;
  if (record.footer !== undefined && !isPdfHeaderFooterSection(record.footer)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_HEADER_HEIGHT = 50;
export const DEFAULT_FOOTER_HEIGHT = 40;
