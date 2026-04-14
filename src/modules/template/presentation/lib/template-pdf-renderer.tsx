import {
  Document,
  Font,
  Image,
  Link,
  Page,
  renderToBuffer,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import * as fs from "fs";
import * as path from "path";
import * as React from "react";

import {
  DEFAULT_DOCUMENT_FONT_FAMILY,
  DEFAULT_DOCUMENT_FONT_SIZE,
  DEFAULT_DOCUMENT_LINE_HEIGHT,
  resolveDocumentFontFamily,
  resolveDocumentFontSize,
  resolveDocumentLineHeight,
  resolvePdfBlockSpacing,
} from "@/shared/lib/document-typography";

import { applyTextTransform } from "../../application/services/template-path-resolver";
import type { PdfHeaderFooterSection, PdfPageConfig } from "../../domain/types/pdf-page-config";
import { DEFAULT_FOOTER_HEIGHT, DEFAULT_HEADER_HEIGHT } from "../../domain/types/pdf-page-config";
import type { TemplateBlocks } from "../../domain/types/template-blocks";
import { resolvePdfImageLayout, resolvePdfImageSource } from "./template-pdf-image-utils";

const ROBOTO_REGULAR_FONT_PATH = path.join(process.cwd(), "public/fonts/Roboto-Regular.ttf");
const ROBOTO_BOLD_FONT_PATH = path.join(process.cwd(), "public/fonts/Roboto-Bold.ttf");

let pdfFontsRegistered = false;

const DEFAULT_PDF_IMAGE_ESTIMATE_HEIGHT = 36;
const PDF_HEADER_FOOTER_FONT_SIZE = 10;
const PDF_HEADER_FOOTER_LINE_HEIGHT = 1.625;
const PDF_PAGE_BODY_PADDING_BOTTOM = 60;
const PDF_PAGE_BODY_PADDING_TOP = 60;
const PDF_PAGE_HORIZONTAL_PADDING = 72;
const PDF_SECTION_SAFE_INSET = 24;
const PDF_SECTION_VERTICAL_PADDING = 4;

const PDF_HEADER_FOOTER_TYPOGRAPHY: InheritedBlockTypography = {
  fontSize: PDF_HEADER_FOOTER_FONT_SIZE,
  lineHeight: PDF_HEADER_FOOTER_LINE_HEIGHT,
};

function registerPdfFonts() {
  if (pdfFontsRegistered) {
    return;
  }

  if (!fs.existsSync(ROBOTO_REGULAR_FONT_PATH) || !fs.existsSync(ROBOTO_BOLD_FONT_PATH)) {
    return;
  }

  Font.register({
    family: "Roboto",
    fonts: [
      {
        src: ROBOTO_REGULAR_FONT_PATH,
        fontStyle: "normal",
        fontWeight: 400,
      },
      {
        src: ROBOTO_REGULAR_FONT_PATH,
        fontStyle: "italic",
        fontWeight: 400,
      },
      {
        src: ROBOTO_BOLD_FONT_PATH,
        fontStyle: "normal",
        fontWeight: 700,
      },
      {
        src: ROBOTO_BOLD_FONT_PATH,
        fontStyle: "italic",
        fontWeight: 700,
      },
    ],
  });

  pdfFontsRegistered = true;
}

registerPdfFonts();

function resolvePdfFontFamily(value: unknown): string {
  const resolvedFontFamily = resolveDocumentFontFamily("pdf", value);

  if (resolvedFontFamily === "Roboto" && !pdfFontsRegistered) {
    return resolveDocumentFontFamily("pdf", DEFAULT_DOCUMENT_FONT_FAMILY);
  }

  return resolvedFontFamily;
}

type PlateTextNode = {
  backgroundColor?: string;
  bold?: boolean;
  code?: boolean;
  color?: string;
  fontFamily?: string;
  fontSize?: string | number;
  highlight?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  text: string;
  underline?: boolean;
  [key: string]: unknown;
};

type PlateElementNode = {
  align?: "left" | "center" | "right" | "justify";
  children: PlateNode[];
  colSizes?: number[];
  fontFamily?: string;
  fontSize?: string | number;
  height?: number;
  imageHeightPx?: number;
  imageWidthPercent?: number;
  indent?: number;
  lineHeight?: string | number;
  listStyleType?: "disc" | "decimal";
  path?: string;
  type: string;
  url?: string;
  width?: number | string;
  [key: string]: unknown;
};

type PlateNode = PlateTextNode | PlateElementNode;

interface InlineRenderContext {
  blockType: string;
  fontFamily?: string;
  fontSize?: string | number;
  lineHeight?: string | number;
}

interface InheritedBlockTypography {
  fontFamily?: string;
  fontSize?: string | number;
  lineHeight?: string | number;
}

type PdfRenderMode = "body" | "headerFooter";

function isTextNode(node: unknown): node is PlateTextNode {
  return (
    typeof node === "object" &&
    node !== null &&
    typeof (node as Record<string, unknown>).text === "string"
  );
}

function isElementNode(node: unknown): node is PlateElementNode {
  return (
    typeof node === "object" &&
    node !== null &&
    typeof (node as Record<string, unknown>).type === "string" &&
    Array.isArray((node as Record<string, unknown>).children)
  );
}

function collectNodeTextContent(node: PlateNode): string {
  if (isTextNode(node)) {
    return node.text;
  }

  if (!isElementNode(node)) {
    return "";
  }

  return node.children.map(collectNodeTextContent).join(" ");
}

function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("#") || value.startsWith("rgb")) return value;
  if (/^[0-9a-fA-F]{3,8}$/.test(value)) return `#${value}`;
  return value;
}

function resolveTextDecoration(
  underline?: boolean,
  strikethrough?: boolean,
): "underline" | "line-through" | "underline line-through" | undefined {
  if (underline && strikethrough) {
    return "underline line-through";
  }

  if (underline) {
    return "underline";
  }

  if (strikethrough) {
    return "line-through";
  }

  return undefined;
}

function resolveTextAlign(
  align: string | undefined,
): "left" | "center" | "right" | "justify" | undefined {
  if (align === "center" || align === "right" || align === "justify") return align;
  return undefined;
}

function resolveIndent(indent?: number): number {
  return typeof indent === "number" ? indent * 20 : 0;
}

function resolveBlockTypography(
  node: PlateElementNode,
  inheritedTypography?: InheritedBlockTypography,
  renderMode: PdfRenderMode = "body",
): Style {
  const baseSpacing = resolvePdfBlockSpacing(node.type);
  const spacing =
    renderMode === "headerFooter"
      ? {
          pdfMarginBottom: node.type === "p" ? 4 : Math.min(baseSpacing.pdfMarginBottom, 6),
          pdfMarginTop: Math.min(baseSpacing.pdfMarginTop, 4),
        }
      : baseSpacing;
  const fontFamily = resolvePdfFontFamily(
    typeof node.fontFamily === "string"
      ? node.fontFamily
      : (inheritedTypography?.fontFamily ?? DEFAULT_DOCUMENT_FONT_FAMILY),
  );
  const fontSize = resolveDocumentFontSize(
    node.fontSize ?? inheritedTypography?.fontSize,
    node.type,
  );
  const lineHeight = resolveDocumentLineHeight(
    node.lineHeight ?? inheritedTypography?.lineHeight ?? DEFAULT_DOCUMENT_LINE_HEIGHT,
  );

  return {
    color: "#1a1a1a",
    fontFamily,
    fontSize,
    lineHeight,
    marginBottom: spacing.pdfMarginBottom,
    marginTop: spacing.pdfMarginTop,
    ...(resolveTextAlign(node.align) ? { textAlign: resolveTextAlign(node.align) } : {}),
  };
}

function resolveBlockContainerStyle(blockStyle: Style, paddingLeft: number, minHeight?: number): Style {
  return {
    marginBottom: blockStyle.marginBottom,
    marginTop: blockStyle.marginTop,
    ...(minHeight ? { minHeight } : {}),
    paddingLeft,
  };
}

function resolveBlockTextStyle(
  blockStyle: Style,
  options?: {
    bold?: boolean;
    minHeight?: number;
  },
): Style {
  return {
    color: blockStyle.color,
    fontFamily: blockStyle.fontFamily,
    fontSize: blockStyle.fontSize,
    lineHeight: blockStyle.lineHeight,
    ...(options?.bold ? { fontWeight: 700 } : {}),
    ...(options?.minHeight ? { minHeight: options.minHeight } : {}),
    ...(blockStyle.textAlign ? { textAlign: blockStyle.textAlign } : {}),
  };
}

function resolveInlineTextStyle(
  node: PlateTextNode,
  context: InlineRenderContext,
): Style | undefined {
  const color = resolveColor(node.color);
  const backgroundColor =
    resolveColor(node.backgroundColor) ?? (node.highlight ? "#FFF176" : undefined);
  const fontFamily =
    typeof node.fontFamily === "string" ? resolvePdfFontFamily(node.fontFamily) : undefined;
  const fontSize =
    typeof node.fontSize === "string" || typeof node.fontSize === "number"
      ? resolveDocumentFontSize(node.fontSize, context.blockType)
      : undefined;
  const lineHeight =
    typeof context.lineHeight === "string" || typeof context.lineHeight === "number"
      ? resolveDocumentLineHeight(context.lineHeight)
      : undefined;
  const textDecoration = resolveTextDecoration(node.underline, node.strikethrough);

  const style: Style = {
    ...(backgroundColor ? { backgroundColor } : {}),
    ...(node.bold ? { fontWeight: 700 } : {}),
    ...(color ? { color } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(node.italic ? { fontStyle: "italic" } : {}),
    ...(lineHeight ? { lineHeight } : {}),
    ...(textDecoration ? { textDecoration } : {}),
  };

  return Object.keys(style).length > 0 ? style : undefined;
}

function renderLeaf(
  node: PlateTextNode,
  key: string,
  context: InlineRenderContext,
): React.ReactElement {
  const inlineStyle = resolveInlineTextStyle(node, context);
  const textContent = node.text === "" ? "\u00A0" : node.text;

  if (node.code) {
    return (
      <Text
        key={key}
        style={[
          styles.codeInline,
          inlineStyle ?? {},
          {
            fontFamily: resolveDocumentFontFamily("pdf", "courier"),
          },
        ]}
      >
        {textContent}
      </Text>
    );
  }

  if (!inlineStyle) {
    return <Text key={key}>{textContent}</Text>;
  }

  return (
    <Text key={key} style={inlineStyle}>
      {textContent}
    </Text>
  );
}

function renderVariableNode(
  node: PlateElementNode,
  key: string,
  context: InlineRenderContext,
): React.ReactElement {
  const rawText = (node.children[0] as PlateTextNode | undefined)?.text ?? "";
  const text = applyTextTransform(rawText, node.textTransform as string | undefined);
  const style = resolveInlineTextStyle(
    {
      backgroundColor: typeof node.backgroundColor === "string" ? node.backgroundColor : undefined,
      bold: node.bold === true,
      color: typeof node.color === "string" ? node.color : undefined,
      fontFamily: typeof node.fontFamily === "string" ? node.fontFamily : context.fontFamily,
      fontSize:
        typeof node.fontSize === "string" || typeof node.fontSize === "number"
          ? node.fontSize
          : context.fontSize,
      italic: node.italic === true,
      strikethrough: node.strikethrough === true,
      text,
      underline: node.underline === true,
    },
    context,
  );

  return (
    <Text key={key} style={style}>
      {text}
    </Text>
  );
}

function renderInlineChildren(
  children: PlateNode[],
  context: InlineRenderContext,
): React.ReactElement[] {
  return children.map((child, index) => {
    if (isTextNode(child)) {
      return renderLeaf(child, `${index}`, context);
    }

    if (isElementNode(child)) {
      if (child.type === "a") {
        const href =
          typeof child.url === "string"
            ? child.url
            : typeof child.path === "string"
              ? child.path
              : "#";

        return (
          <Link key={index} src={href} style={{ color: "#2563eb", textDecoration: "underline" }}>
            {renderInlineChildren(child.children, context)}
          </Link>
        );
      }

      if (child.type === "variable") {
        // System variables ($page_number, $total_pages) must use Text's render prop
        // because totalPages is only available there, not on View's render prop.
        const fieldPath = typeof child.fieldPath === "string" ? child.fieldPath : "";
        if (fieldPath === SYSTEM_VAR_PAGE_NUMBER || fieldPath === SYSTEM_VAR_TOTAL_PAGES) {
          return renderSystemVariableNode(child, `${index}`, context);
        }
        return renderVariableNode(child, `${index}`, context);
      }

      return <Text key={index}>{renderInlineChildren(child.children, context)}</Text>;
    }

    return <Text key={index} />;
  });
}

// ---------------------------------------------------------------------------
// System-variable resolution for header/footer
// ---------------------------------------------------------------------------

/** System variable field paths populated at render time. */
const SYSTEM_VAR_PAGE_NUMBER = "$page_number";
const SYSTEM_VAR_TOTAL_PAGES = "$total_pages";
const SYSTEM_VAR_CURRENT_DATE = "$current_date";
const SYSTEM_VAR_TEMPLATE_NAME = "$template_name";

/**
 * Renders $page_number and $total_pages as dynamic <Text render={...}/> nodes.
 * This is the ONLY way to access totalPages in @react-pdf/renderer — it is
 * available on Text's render prop but NOT on View's render prop.
 */
function renderSystemVariableNode(
  node: PlateElementNode,
  key: string,
  context: InlineRenderContext,
): React.ReactElement {
  const fieldPath = typeof node.fieldPath === "string" ? node.fieldPath : "";
  const style = resolveInlineTextStyle(
    {
      bold: node.bold === true,
      color: typeof node.color === "string" ? node.color : undefined,
      fontFamily: typeof node.fontFamily === "string" ? node.fontFamily : context.fontFamily,
      fontSize:
        typeof node.fontSize === "string" || typeof node.fontSize === "number"
          ? node.fontSize
          : context.fontSize,
      italic: node.italic === true,
      strikethrough: node.strikethrough === true,
      text: "",
      underline: node.underline === true,
    },
    context,
  );

  if (fieldPath === SYSTEM_VAR_PAGE_NUMBER) {
    return <Text key={key} style={style} render={({ pageNumber }) => String(pageNumber)} />;
  }

  // $total_pages
  return <Text key={key} style={style} render={({ totalPages }) => String(totalPages)} />;
}

interface SystemVarContext {
  /** Static: resolved once at render time, same value on every page. */
  currentDate?: string;
  templateName?: string;
}

/**
 * Resolves STATIC system variables only.
 * Dynamic variables ($page_number, $total_pages) are NOT handled here —
 * they flow through to renderSystemVariableNode which uses Text's render prop.
 */
function resolveSystemVariable(fieldPath: string, ctx: SystemVarContext): string | null {
  switch (fieldPath) {
    case SYSTEM_VAR_CURRENT_DATE:
      return ctx.currentDate ?? new Date().toLocaleDateString("es-PE");
    case SYSTEM_VAR_TEMPLATE_NAME:
      return ctx.templateName ?? "";
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#1a1a1a",
    fontFamily: resolveDocumentFontFamily("pdf", DEFAULT_DOCUMENT_FONT_FAMILY),
    fontSize: DEFAULT_DOCUMENT_FONT_SIZE,
    lineHeight: DEFAULT_DOCUMENT_LINE_HEIGHT,
    paddingBottom: PDF_PAGE_BODY_PADDING_BOTTOM,
    paddingHorizontal: PDF_PAGE_HORIZONTAL_PADDING,
    paddingTop: PDF_PAGE_BODY_PADDING_TOP,
  },
  blockquote: {
    borderLeftColor: "#9ca3af",
    borderLeftWidth: 2,
    paddingLeft: 14,
  },
  codeInline: {
    backgroundColor: "#f3f4f6",
    borderRadius: 2,
    color: "#c62828",
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  hr: {
    borderBottomColor: "#d1d5db",
    borderBottomWidth: 1,
    marginBottom: 14,
    marginTop: 14,
  },
  image: {
    marginBottom: 12,
    marginTop: 12,
    objectFit: "contain",
  },
  listItem: {
    flexDirection: "row",
  },
  listContent: {
    flex: 1,
  },
  listMarker: {
    width: 20,
  },
  table: {
    marginBottom: 12,
    marginTop: 12,
  },
  tableCell: {
    padding: 6,
  },
  tableHeaderCell: {
    backgroundColor: "#f9fafb",
    padding: 6,
  },
  tableRow: {
    flexDirection: "row",
  },
  headerSection: {
    borderBottomColor: "#e5e7eb",
    borderBottomWidth: 0.5,
    paddingBottom: 6,
  },
  footerSection: {
    borderTopColor: "#e5e7eb",
    borderTopWidth: 0.5,
    paddingTop: 6,
  },
});

function estimatePdfBlockHeight(
  node: PlateElementNode,
  inheritedTypography?: InheritedBlockTypography,
  renderMode: PdfRenderMode = "body",
): number {
  const spacing =
    renderMode === "headerFooter"
      ? {
          pdfMarginBottom: node.type === "p" ? 4 : 6,
          pdfMarginTop: 4,
        }
      : resolvePdfBlockSpacing(node.type);
  const verticalSpacing = spacing.pdfMarginTop + spacing.pdfMarginBottom;

  if (node.type === "img" || node.type === "image") {
    const { heightPx } = resolvePdfImageLayout(node);
    return Math.ceil((heightPx ?? DEFAULT_PDF_IMAGE_ESTIMATE_HEIGHT) + 12);
  }

  if (node.type === "hr") {
    return Math.ceil(12 + verticalSpacing);
  }

  if (node.type === "table") {
    const rows = node.children.filter(isElementNode).length || 1;
    return Math.ceil(rows * 28 + verticalSpacing);
  }

  const fontSize = resolveDocumentFontSize(
    node.fontSize ?? inheritedTypography?.fontSize,
    node.type,
  );
  const lineHeight = resolveDocumentLineHeight(
    node.lineHeight ?? inheritedTypography?.lineHeight ?? DEFAULT_DOCUMENT_LINE_HEIGHT,
  );
  const textContent = collectNodeTextContent(node).trim();
  const charsPerLine = node.type.startsWith("h") ? 42 : 70;
  const lineCount = Math.max(1, Math.ceil(Math.max(textContent.length, 1) / charsPerLine));

  return Math.ceil(fontSize * lineHeight * lineCount + verticalSpacing);
}

function resolvePdfSectionHeight(
  section: PdfHeaderFooterSection | undefined,
  fallbackHeight: number,
): number {
  if (!section?.enabled) {
    return 0;
  }

  if (typeof section.height === "number" && Number.isFinite(section.height) && section.height > 0) {
    return Math.max(fallbackHeight, Math.round(section.height));
  }

  const blocks: PlateElementNode[] = Array.isArray(section.blocks)
    ? (section.blocks as unknown[]).filter(isElementNode)
    : [];
  if (blocks.length === 0) {
    return fallbackHeight;
  }

  const estimatedContentHeight = blocks.reduce(
    (total, block) =>
      total + estimatePdfBlockHeight(block, PDF_HEADER_FOOTER_TYPOGRAPHY, "headerFooter"),
    0,
  );

  return Math.max(
    fallbackHeight,
    Math.ceil(estimatedContentHeight + PDF_SECTION_VERTICAL_PADDING * 2),
  );
}

function renderBlock(
  node: PlateElementNode,
  key: string,
  siblings: PlateElementNode[],
  inheritedTypography?: InheritedBlockTypography,
  renderMode: PdfRenderMode = "body",
): React.ReactElement | null {
  const paddingLeft = resolveIndent(node.indent);
  const effectiveFontFamily =
    typeof node.fontFamily === "string" ? node.fontFamily : inheritedTypography?.fontFamily;
  const effectiveFontSize =
    typeof node.fontSize === "string" || typeof node.fontSize === "number"
      ? node.fontSize
      : inheritedTypography?.fontSize;
  const effectiveLineHeight =
    typeof node.lineHeight === "string" || typeof node.lineHeight === "number"
      ? node.lineHeight
      : inheritedTypography?.lineHeight;
  const blockStyle = resolveBlockTypography(node, inheritedTypography, renderMode);
  const inlineContext: InlineRenderContext = {
    blockType: node.type,
    fontFamily: effectiveFontFamily,
    fontSize: effectiveFontSize,
    lineHeight: effectiveLineHeight,
  };
  const inlines = renderInlineChildren(node.children, inlineContext);

  const minHeight =
    typeof blockStyle.fontSize === "number" && typeof blockStyle.lineHeight === "number"
      ? blockStyle.fontSize * blockStyle.lineHeight
      : undefined;

  if (node.type === "hr") {
    return <View key={key} style={styles.hr} />;
  }

  if (node.type === "img" || node.type === "image") {
    const src = resolvePdfImageSource(node);

    if (!src) return null;

    const { heightPx, widthPercent, widthPoints } = resolvePdfImageLayout(node);
    const align = resolveTextAlign(node.align) ?? "center";

    return (
      <View
        key={key}
        style={[
          styles.image,
          renderMode === "headerFooter" ? { marginBottom: 6, marginTop: 6 } : {},
          {
            alignItems:
              align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
            paddingLeft,
            width: "100%",
          },
        ]}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is a PDF primitive */}
        <Image
          src={src}
          style={{
            height: heightPx,
            objectFit: "contain",
            ...(typeof widthPoints === "number" ? { width: widthPoints } : {}),
            ...(typeof widthPercent === "number" ? { width: `${widthPercent}%` } : {}),
          }}
        />
      </View>
    );
  }

  if (node.type === "table") {
    const rows = node.children.filter(isElementNode);
    const lastRowIndex = rows.length - 1;
    const firstRowCells = rows[0]?.children.filter(isElementNode) ?? [];
    const rawColSizes = Array.isArray(node.colSizes) ? node.colSizes : [];
    const defaultColWidth = 120;
    const effectiveColSizes = Array.from({ length: firstRowCells.length || 1 }, (_, index) => {
      const current = rawColSizes[index];
      return typeof current === "number" && current > 0 ? current : defaultColWidth;
    });
    const totalColWidth = effectiveColSizes.reduce((sum, current) => sum + current, 0);

    return (
      <View key={key} style={styles.table}>
        {rows.map((row, rowIndex) => (
          <View key={`${key}-row-${rowIndex}`} style={styles.tableRow}>
            {row.children.filter(isElementNode).map((cell, cellIndex) => {
              const widthPercent =
                ((effectiveColSizes[cellIndex] ?? defaultColWidth) / totalColWidth) * 100;
              const borders = cell.borders as
                | Record<string, { color?: string; size?: number }>
                | undefined;
              const borderStyle: Style = {};

              if (borders) {
                if (borders.top?.size) {
                  borderStyle.borderTopColor = borders.top.color ?? "#d1d5db";
                  borderStyle.borderTopWidth = 1;
                }
                if (borders.bottom?.size) {
                  borderStyle.borderBottomColor = borders.bottom.color ?? "#d1d5db";
                  borderStyle.borderBottomWidth = 1;
                }
                if (borders.left?.size) {
                  borderStyle.borderLeftColor = borders.left.color ?? "#d1d5db";
                  borderStyle.borderLeftWidth = 1;
                }
                if (borders.right?.size) {
                  borderStyle.borderRightColor = borders.right.color ?? "#d1d5db";
                  borderStyle.borderRightWidth = 1;
                }
              } else {
                if (rowIndex < lastRowIndex) {
                  borderStyle.borderBottomColor = "#e5e7eb";
                  borderStyle.borderBottomWidth = 1;
                }
                if (cellIndex < row.children.length - 1) {
                  borderStyle.borderRightColor = "#e5e7eb";
                  borderStyle.borderRightWidth = 1;
                }
              }

              const backgroundColor =
                typeof cell.background === "string" ? resolveColor(cell.background) : undefined;
              const blockChildren = cell.children.filter(isElementNode);
              const inheritedCellTypography: InheritedBlockTypography = {
                fontFamily:
                  typeof cell.fontFamily === "string"
                    ? cell.fontFamily
                    : typeof node.fontFamily === "string"
                      ? node.fontFamily
                      : inheritedTypography?.fontFamily,
                fontSize:
                  typeof cell.fontSize === "string" || typeof cell.fontSize === "number"
                    ? cell.fontSize
                    : typeof node.fontSize === "string" || typeof node.fontSize === "number"
                      ? node.fontSize
                      : inheritedTypography?.fontSize,
                lineHeight:
                  typeof cell.lineHeight === "string" || typeof cell.lineHeight === "number"
                    ? cell.lineHeight
                    : typeof node.lineHeight === "string" || typeof node.lineHeight === "number"
                      ? node.lineHeight
                      : inheritedTypography?.lineHeight,
              };

              return (
                <View
                  key={`${key}-row-${rowIndex}-cell-${cellIndex}`}
                  style={[
                    cell.type === "th" ? styles.tableHeaderCell : styles.tableCell,
                    borderStyle,
                    backgroundColor ? { backgroundColor } : {},
                    { width: `${widthPercent.toFixed(2)}%` },
                  ]}
                >
                  {blockChildren.length > 0 ? (
                    blockChildren.map((childBlock, blockIndex) =>
                      renderBlock(
                        childBlock,
                        `${key}-row-${rowIndex}-cell-${cellIndex}-block-${blockIndex}`,
                        blockChildren,
                        inheritedCellTypography,
                        renderMode,
                      ),
                    )
                  ) : (
                    <View
                      style={[
                        resolveBlockTypography(
                          {
                            ...cell,
                            type: "p",
                          },
                          inheritedCellTypography,
                          renderMode,
                        ),
                        { marginBottom: 0, marginTop: 0 },
                      ]}
                    >
                      <Text>
                        {renderInlineChildren(cell.children, {
                          blockType: "p",
                          fontFamily: inheritedCellTypography.fontFamily,
                          fontSize: inheritedCellTypography.fontSize,
                          lineHeight: inheritedCellTypography.lineHeight,
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }

  if (node.listStyleType === "disc") {
    return (
      <View key={key} style={[styles.listItem, { paddingLeft }]}>
        <Text style={[styles.listMarker, blockStyle, { minHeight }]}>{"•"}</Text>
        <Text
          style={[styles.listContent, blockStyle, { marginBottom: 0, marginTop: 0, minHeight }]}
        >
          {inlines}
        </Text>
      </View>
    );
  }

  if (node.listStyleType === "decimal") {
    const currentIndex = Math.max(0, siblings.indexOf(node));
    const precedingIndex = siblings
      .slice(0, currentIndex)
      .filter(
        (sibling) => sibling.listStyleType === "decimal" && sibling.indent === node.indent,
      ).length;
    const listNumber = precedingIndex + 1;

    return (
      <View key={key} style={[styles.listItem, { paddingLeft }]}>
        <Text style={[styles.listMarker, blockStyle, { minHeight }]}>{`${listNumber}.`}</Text>
        <Text
          style={[styles.listContent, blockStyle, { marginBottom: 0, marginTop: 0, minHeight }]}
        >
          {inlines}
        </Text>
      </View>
    );
  }

  if (node.type === "blockquote") {
    return (
      <View key={key} style={[styles.blockquote, { marginLeft: paddingLeft }]}>
        <Text style={[blockStyle, { fontStyle: "italic", minHeight }]}>{inlines}</Text>
      </View>
    );
  }

  return (
    <View key={key} style={resolveBlockContainerStyle(blockStyle, paddingLeft, minHeight)}>
      <Text style={resolveBlockTextStyle(blockStyle, { bold: node.type.startsWith("h") })}>
        {inlines}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header / Footer block rendering helpers
// ---------------------------------------------------------------------------

/**
 * Recursively replace system-variable nodes so they show resolved values
 * (pageNumber, totalPages, currentDate, templateName).
 */
function patchSystemVariables(node: PlateElementNode, ctx: SystemVarContext): PlateElementNode {
  if (node.type === "variable") {
    const fieldPath = typeof node.fieldPath === "string" ? node.fieldPath : "";
    const resolved = resolveSystemVariable(fieldPath, ctx);
    if (resolved !== null) {
      return { ...node, children: [{ text: resolved }] };
    }
  }

  if (Array.isArray(node.children)) {
    return {
      ...node,
      children: node.children.map((child) =>
        isElementNode(child) ? patchSystemVariables(child, ctx) : child,
      ),
    };
  }

  return node;
}

function renderHeaderFooterBlocks(
  blocks: TemplateBlocks,
  sysCtx: SystemVarContext,
): React.ReactElement[] {
  if (!Array.isArray(blocks)) return [];
  const elementNodes = (blocks as unknown[]).filter(isElementNode);
  return elementNodes
    .map((node, index) => {
      const patched = patchSystemVariables(node, sysCtx);
      return (
        renderBlock(
          patched,
          `hf-${index}`,
          elementNodes,
          PDF_HEADER_FOOTER_TYPOGRAPHY,
          "headerFooter",
        ) ?? <View key={`hf-${index}`} />
      );
    })
    .filter((el): el is React.ReactElement => el !== null);
}

function TemplateDocument({
  blocks,
  title,
  pageConfig,
}: {
  blocks: PlateElementNode[];
  title?: string;
  pageConfig?: PdfPageConfig | null;
}): React.ReactElement {
  const header: PdfHeaderFooterSection | undefined = pageConfig?.header?.enabled
    ? pageConfig.header
    : undefined;
  const footer: PdfHeaderFooterSection | undefined = pageConfig?.footer?.enabled
    ? pageConfig.footer
    : undefined;

  const headerHeight = resolvePdfSectionHeight(header, DEFAULT_HEADER_HEIGHT);
  const footerHeight = resolvePdfSectionHeight(footer, DEFAULT_FOOTER_HEIGHT);

  const paddingTop = PDF_PAGE_BODY_PADDING_TOP + headerHeight;
  const paddingBottom = PDF_PAGE_BODY_PADDING_BOTTOM + footerHeight;

  const currentDate = new Date().toLocaleDateString("es-PE");
  const templateName = title ?? "";

  return (
    <Document title={title} author="Lumacraft" creator="Lumacraft">
      <Page size="A4" style={[styles.page, { paddingTop, paddingBottom }]}>
        {/* ── Fixed Header ── */}
        {header && (
          <View
            fixed
            style={[
              styles.headerSection,
              {
                position: "absolute",
                top: PDF_SECTION_SAFE_INSET,
                left: PDF_PAGE_HORIZONTAL_PADDING,
                minHeight: headerHeight,
                paddingBottom: PDF_SECTION_VERTICAL_PADDING,
                paddingTop: PDF_SECTION_VERTICAL_PADDING,
                right: PDF_PAGE_HORIZONTAL_PADDING,
              },
            ]}
          >
            {/* Static vars ($current_date, $template_name) resolved by patchSystemVariables.
                Dynamic vars ($page_number, $total_pages) handled in renderInlineChildren
                via renderSystemVariableNode which uses Text's render prop. */}
            {renderHeaderFooterBlocks(header.blocks, { currentDate, templateName })}
          </View>
        )}

        {/* ── Body ── */}
        {blocks.map((block, index) => renderBlock(block, `${index}`, blocks))}

        {/* ── Fixed Footer ── */}
        {footer && (
          <View
            fixed
            style={[
              styles.footerSection,
              {
                position: "absolute",
                bottom: PDF_SECTION_SAFE_INSET,
                left: PDF_PAGE_HORIZONTAL_PADDING,
                minHeight: footerHeight,
                paddingBottom: PDF_SECTION_VERTICAL_PADDING,
                paddingTop: PDF_SECTION_VERTICAL_PADDING,
                right: PDF_PAGE_HORIZONTAL_PADDING,
              },
            ]}
          >
            {renderHeaderFooterBlocks(footer.blocks, { currentDate, templateName })}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function renderTemplateToPdfBuffer(
  blocks: TemplateBlocks,
  title?: string,
  pageConfig?: PdfPageConfig | null,
): Promise<Buffer> {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return renderToBuffer(<TemplateDocument blocks={[]} title={title} pageConfig={pageConfig} />);
  }

  const elementNodes = (blocks as unknown[]).filter(isElementNode);
  return renderToBuffer(
    <TemplateDocument blocks={elementNodes} title={title} pageConfig={pageConfig} />,
  );
}
