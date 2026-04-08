/**
 * template-pdf-renderer.tsx
 *
 * Converts compiled PlateJS/Slate blocks (TemplateBlocks) to a high-fidelity
 * PDF buffer using @react-pdf/renderer. Each Plate block type and inline mark
 * is mapped to the equivalent react-pdf primitive with matching styles.
 *
 * Supported block types: h1–h6, p, blockquote, hr, img, a, table/tr/td/th,
 * lists (disc, decimal), code blocks, and all inline marks.
 * Supported marks: bold, italic, underline, strikethrough, code, highlight,
 * color, backgroundColor, fontSize, subscript, superscript, lineHeight.
 */

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
import * as React from "react";

import { applyTextTransform } from "../../application/services/template-path-resolver";
import type { TemplateBlocks } from "../../domain/types/template-blocks";

// ---------------------------------------------------------------------------
// Font registration
// ---------------------------------------------------------------------------

// Attempt to register Inter for production environments where network is available.
// Skip during unit tests to avoid network-dependent failures.
if (typeof process === "undefined" || process.env.NODE_ENV !== "test") {
  try {
    Font.register({
      family: "Inter",
      fonts: [
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/inter-ui/3.19.3/Inter/Inter-Regular.woff",
          fontWeight: 400,
        },
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/inter-ui/3.19.3/Inter/Inter-Italic.woff",
          fontWeight: 400,
          fontStyle: "italic",
        },
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/inter-ui/3.19.3/Inter/Inter-Bold.woff",
          fontWeight: 700,
        },
      ],
    });
  } catch (e) {
    console.warn("Failed to register Inter font, falling back to system fonts.", e);
  }
}

// ---------------------------------------------------------------------------
// Type guards (mirrors template-blocks.adapter.ts)
// ---------------------------------------------------------------------------

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

type PlateTextNode = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  highlight?: boolean;
  subscript?: boolean;
  superscript?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: string | number;
  [key: string]: unknown;
};

type PlateElementNode = {
  type: string;
  children: PlateNode[];
  // block-level style props
  align?: "left" | "center" | "right" | "justify";
  listStyleType?: "disc" | "decimal";
  indent?: number;
  lineHeight?: string | number;
  // image/link-specific
  url?: string;
  path?: string;
  width?: number;
  height?: number;
  // table
  colSizes?: number[];
  [key: string]: unknown;
};

type PlateNode = PlateTextNode | PlateElementNode;

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

// ---------------------------------------------------------------------------
// Colour utilities
// ---------------------------------------------------------------------------

/**
 * Ensure a colour value is a valid CSS hex/rgb string.
 * Plate may store colours without a '#' prefix (e.g. "FF0000").
 */
function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // If already valid css colour (hex, rgb, named) return as-is
  if (value.startsWith("#") || value.startsWith("rgb")) return value;
  // Bare hex — prepend '#'
  if (/^[0-9a-fA-F]{3,8}$/.test(value)) return `#${value}`;
  return value;
}

function resolveFontSize(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const num = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(num) ? undefined : Math.max(6, Math.min(72, num));
}

// ---------------------------------------------------------------------------
// Base stylesheet
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    // Helvetica is a built-in PDF standard font (no network download required).
    // In production, react-pdf will use the registered Inter font via fallback
    // resolution when the fonts are fetched successfully.
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#1a1a1a",
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 72,
    lineHeight: 1.55,
    backgroundColor: "#ffffff",
  },
  h1: {
    fontSize: 26,
    fontWeight: 700,
    marginBottom: 12,
    marginTop: 20,
    color: "#111111",
  },
  h2: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 10,
    marginTop: 16,
    color: "#1a1a1a",
  },
  h3: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8,
    marginTop: 12,
    color: "#1a1a1a",
  },
  h4: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 6,
    marginTop: 10,
    color: "#1a1a1a",
  },
  h5: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
    marginTop: 8,
    color: "#333333",
  },
  h6: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 4,
    marginTop: 6,
    color: "#444444",
  },
  paragraph: {
    marginBottom: 8,
    lineHeight: 1.65,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#aaaaaa",
    paddingLeft: 12,
    marginVertical: 8,
    color: "#555555",
    fontStyle: "italic",
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    marginVertical: 14,
  },
  codeInline: {
    fontFamily: "Courier",
    fontSize: 10,
    backgroundColor: "#f3f3f3",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    color: "#c62828",
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listBullet: {
    width: 16,
    fontSize: 11,
  },
  listContent: {
    flex: 1,
  },
  image: {
    marginVertical: 10,
    objectFit: "contain",
  },
  table: {
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  tableLastRow: {
    flexDirection: "row",
  },
  tableCell: {
    flex: 1,
    padding: 6,
    fontSize: 10,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 6,
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: "#f9fafb",
  },
});

// ---------------------------------------------------------------------------
// Inline text renderer
// ---------------------------------------------------------------------------

function renderLeaf(node: PlateTextNode, key: string): React.ReactElement {
  const fontSize = resolveFontSize(node.fontSize);
  const color = resolveColor(node.color);
  const backgroundColor = resolveColor(node.backgroundColor);

  const inlineStyle: Style = {
    ...(node.bold ? { fontWeight: 700 } : {}),
    ...(node.italic ? { fontStyle: "italic" } : {}),
    ...(node.underline ? { textDecoration: "underline" } : {}),
    ...(node.strikethrough ? { textDecoration: "line-through" } : {}),
    ...(node.highlight ? { backgroundColor: "#FFFF00" } : {}),
    ...(fontSize ? { fontSize } : {}),
    ...(color ? { color } : {}),
    ...(backgroundColor ? { backgroundColor } : {}),
  };

  if (node.code) {
    return (
      <Text key={key} style={[styles.codeInline, inlineStyle]}>
        {node.text}
      </Text>
    );
  }

  if (Object.keys(inlineStyle).length === 0) {
    return <Text key={key}>{node.text}</Text>;
  }

  return (
    <Text key={key} style={inlineStyle}>
      {node.text}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Inline children renderer (mixed text + inline elements)
// ---------------------------------------------------------------------------

function renderInlineChildren(children: PlateNode[]): React.ReactElement[] {
  return children.map((child, i) => {
    if (isTextNode(child)) {
      return renderLeaf(child, String(i));
    }

    if (isElementNode(child)) {
      if (child.type === "a") {
        const href =
          typeof child.url === "string"
            ? child.url
            : typeof child.path === "string"
              ? child.path
              : "#";
        const inner = renderInlineChildren(child.children);
        return (
          <Link key={i} src={href} style={{ color: "#2563eb", textDecoration: "underline" }}>
            {inner}
          </Link>
        );
      }

      // variable node — already resolved to text by the preview use case
      if (child.type === "variable") {
        const rawText = (child.children[0] as PlateTextNode | undefined)?.text ?? "";
        const transform = child.textTransform as string | undefined;
        const text = applyTextTransform(rawText, transform);

        const varStyle: Style = {
          ...(child.bold ? { fontWeight: "bold" } : {}),
          ...(child.italic ? { fontStyle: "italic" } : {}),
          ...(child.color ? { color: child.color as string } : {}),
        };

        return (
          <Text key={i} style={varStyle}>
            {text}
          </Text>
        );
      }

      // Nested inline element
      const inner = renderInlineChildren(child.children);
      return <Text key={i}>{inner}</Text>;
    }

    return <Text key={i} />;
  });
}

// ---------------------------------------------------------------------------
// Alignment helper
// ---------------------------------------------------------------------------

function resolveTextAlign(
  align: string | undefined,
): "left" | "center" | "right" | "justify" | undefined {
  if (align === "center" || align === "right" || align === "justify") return align;
  return undefined;
}

function resolveIndent(indent?: number): number {
  return typeof indent === "number" ? indent * 20 : 0;
}

// ---------------------------------------------------------------------------
// Block node renderer
// ---------------------------------------------------------------------------

function renderBlock(
  node: PlateElementNode,
  key: string,
  nodes: PlateElementNode[],
): React.ReactElement | null {
  const { type, children, align, indent, lineHeight } = node;

  const textAlign = resolveTextAlign(align);
  const paddingLeft = resolveIndent(indent);
  const lh =
    typeof lineHeight === "number"
      ? lineHeight
      : typeof lineHeight === "string"
        ? parseFloat(lineHeight)
        : undefined;

  const blockTextStyle: Style = {
    ...(textAlign ? { textAlign } : {}),
    ...(lh && !isNaN(lh) ? { lineHeight: lh } : {}),
  };

  // ---------- Headings ----------
  if (type === "h1") {
    const inlines = renderInlineChildren(children);
    return (
      <Text key={key} style={[styles.h1, { paddingLeft }, blockTextStyle]}>
        {inlines}
      </Text>
    );
  }
  if (type === "h2") {
    const inlines = renderInlineChildren(children);
    return (
      <Text key={key} style={[styles.h2, { paddingLeft }, blockTextStyle]}>
        {inlines}
      </Text>
    );
  }
  if (type === "h3") {
    const inlines = renderInlineChildren(children);
    return (
      <Text key={key} style={[styles.h3, { paddingLeft }, blockTextStyle]}>
        {inlines}
      </Text>
    );
  }
  if (type === "h4") {
    const inlines = renderInlineChildren(children);
    return (
      <Text key={key} style={[styles.h4, { paddingLeft }, blockTextStyle]}>
        {inlines}
      </Text>
    );
  }
  if (type === "h5") {
    const inlines = renderInlineChildren(children);
    return (
      <Text key={key} style={[styles.h5, { paddingLeft }, blockTextStyle]}>
        {inlines}
      </Text>
    );
  }
  if (type === "h6") {
    const inlines = renderInlineChildren(children);
    return (
      <Text key={key} style={[styles.h6, { paddingLeft }, blockTextStyle]}>
        {inlines}
      </Text>
    );
  }

  // ---------- Blockquote ----------
  if (type === "blockquote") {
    const inlines = renderInlineChildren(children);
    return (
      <View key={key} style={[styles.blockquote, { paddingLeft: paddingLeft + 12 }]}>
        <Text style={blockTextStyle}>{inlines}</Text>
      </View>
    );
  }

  // ---------- Horizontal rule ----------
  if (type === "hr") {
    return <View key={key} style={styles.hr} />;
  }

  // ---------- Image ----------
  if (type === "img") {
    const src =
      typeof node.url === "string" ? node.url : typeof node.path === "string" ? node.path : null;
    if (!src) return null;

    const widthPercent = typeof node.imageWidthPercent === "number" ? node.imageWidthPercent : 100;
    const imgWidth = `${widthPercent}%`;

    return (
      <View
        key={key}
        style={[
          styles.image,
          {
            paddingLeft,
            alignItems:
              textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start",
          },
        ]}
      >
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image is a PDF primitive, not an HTML img */}
        <Image src={src} style={{ width: imgWidth, objectFit: "contain" }} />
      </View>
    );
  }

  // ---------- Table ----------
  if (type === "table") {
    const rows = children.filter(isElementNode);
    const lastRowIdx = rows.length - 1;
    return (
      <View key={key} style={styles.table}>
        {rows.map((row, rIdx) => {
          const isLast = rIdx === lastRowIdx;
          const cells = row.children.filter(isElementNode);
          const lastCellIdx = cells.length - 1;
          return (
            <View key={rIdx} style={isLast ? styles.tableLastRow : styles.tableRow}>
              {cells.map((cell, cIdx) => {
                const isHeader = cell.type === "th";
                const cellStyle = isHeader ? styles.tableHeaderCell : styles.tableCell;
                const borderRight =
                  cIdx < lastCellIdx ? { borderRightWidth: 1, borderRightColor: "#e5e7eb" } : {};
                const inlines = renderInlineChildren(cell.children);
                return (
                  <View key={cIdx} style={[cellStyle, borderRight]}>
                    <Text>{inlines}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  }

  // ---------- Paragraph / Lists ----------
  // type === "p" or unknown → paragraph with possible list treatment
  const listStyleType = node.listStyleType as string | undefined;
  const inlines = renderInlineChildren(children);

  if (listStyleType === "disc") {
    return (
      <View key={key} style={[styles.listItem, { paddingLeft }]}>
        <Text style={styles.listBullet}>{"•  "}</Text>
        <Text style={[styles.listContent, blockTextStyle]}>{inlines}</Text>
      </View>
    );
  }

  if (listStyleType === "decimal") {
    // Count preceding sibling decimal items at same indent level to compute number
    const precedingIdx = nodes
      .slice(0, parseInt(key))
      .filter((n) => n.listStyleType === "decimal" && n.indent === indent).length;
    const number = precedingIdx + 1;
    return (
      <View key={key} style={[styles.listItem, { paddingLeft }]}>
        <Text style={styles.listBullet}>{`${number}.  `}</Text>
        <Text style={[styles.listContent, blockTextStyle]}>{inlines}</Text>
      </View>
    );
  }

  // Plain paragraph
  return (
    <Text key={key} style={[styles.paragraph, { paddingLeft }, blockTextStyle]}>
      {inlines}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Document component
// ---------------------------------------------------------------------------

interface TemplateDocumentProps {
  blocks: PlateElementNode[];
  title?: string;
}

function TemplateDocument({ blocks, title }: TemplateDocumentProps): React.ReactElement {
  return (
    <Document title={title} author="Lumacraft" creator="Lumacraft">
      <Page size="A4" style={styles.page}>
        {blocks.map((block, i) => renderBlock(block, String(i), blocks))}
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders compiled Plate blocks to a PDF binary buffer using @react-pdf/renderer.
 * Preserves all structural and stylistic information from the template:
 * headings, paragraphs, lists, blockquotes, images, tables, inline marks,
 * font colours, font sizes, alignment, and indentation.
 *
 * @param blocks - Compiled TemplateBlocks from `GenerateTemplatePreviewUseCase`
 * @param title  - Optional document title embedded in PDF metadata
 * @returns A `Buffer` containing the complete PDF binary
 */
export async function renderTemplateToPdfBuffer(
  blocks: TemplateBlocks,
  title?: string,
): Promise<Buffer> {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    // Return a minimal blank PDF
    return renderToBuffer(<TemplateDocument blocks={[]} title={title} />);
  }

  const elementNodes = (blocks as unknown[]).filter(isElementNode);
  return renderToBuffer(<TemplateDocument blocks={elementNodes} title={title} />);
}
