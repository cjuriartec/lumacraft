/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import * as docx from "https://esm.sh/docx";

import {
  DEFAULT_DOCUMENT_FONT_FAMILY,
  DEFAULT_DOCUMENT_LINE_HEIGHT,
  resolveDocumentFontFamily,
  resolveDocxBlockSpacing,
  resolveDocxFontSize,
  resolveDocxLineHeight,
} from "../../../src/shared/lib/document-typography.ts";

const {
  AlignmentType,
  Document,
  HeadingLevel,
  LevelFormat,
  LineRuleType,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = docx;

const DOCX_NUMBERING_REFERENCE = "lumacraft-decimal";

interface DocxTypographyContext {
  fontFamily?: string;
  fontSize?: string | number;
  lineHeight?: string | number;
}

async function handleCORS(_req?: Request) {
  return new Response("ok", { headers: corsHeaders });
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTextNode(value: unknown): value is { text: string; [key: string]: unknown } {
  return isRecord(value) && typeof value.text === "string";
}

function isElementNode(
  value: unknown,
): value is { type: string; children: unknown[]; [key: string]: unknown } {
  return isRecord(value) && typeof value.type === "string" && Array.isArray(value.children);
}

function applyTextTransform(text: string, transform?: string): string {
  if (!text || !transform || transform === "none") return text;

  switch (transform) {
    case "uppercase":
      return text.toUpperCase();
    case "lowercase":
      return text.toLowerCase();
    case "capitalize":
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    default:
      return text;
  }
}

function mapAlignment(align?: string): any {
  switch (align) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.BOTH;
    default:
      return AlignmentType.LEFT;
  }
}

function resolveDocxColor(value?: string): string | undefined {
  if (!value) return undefined;
  return value.replace(/^#/, "");
}

function resolveIndentTwips(indent?: number): number {
  return typeof indent === "number" ? indent * 360 : 0;
}

function resolveHeadingLevel(type?: string): any | undefined {
  switch (type) {
    case "h1":
      return HeadingLevel.HEADING_1;
    case "h2":
      return HeadingLevel.HEADING_2;
    case "h3":
      return HeadingLevel.HEADING_3;
    case "h4":
      return HeadingLevel.HEADING_4;
    case "h5":
      return HeadingLevel.HEADING_5;
    case "h6":
      return HeadingLevel.HEADING_6;
    default:
      return undefined;
  }
}

function createTextRun(
  source: Record<string, unknown>,
  context: {
    blockType: string;
    fontFamily?: string;
    fontSize?: string | number;
  },
  text: string,
  overrides: Record<string, unknown> = {},
) {
  const fontFamily =
    typeof source.fontFamily === "string"
      ? source.fontFamily
      : typeof overrides.fontFamily === "string"
        ? overrides.fontFamily
        : context.fontFamily;
  const fontSize =
    typeof source.fontSize === "string" || typeof source.fontSize === "number"
      ? source.fontSize
      : (overrides.fontSize ?? context.fontSize);
  const color =
    typeof overrides.color === "string"
      ? overrides.color
      : typeof source.color === "string"
        ? source.color
        : undefined;
  const underline = overrides.underline === true || source.underline === true;

  return new TextRun({
    text,
    bold: source.bold === true || overrides.bold === true,
    color: resolveDocxColor(color),
    font: resolveDocumentFontFamily(
      "docx",
      typeof fontFamily === "string" ? fontFamily : DEFAULT_DOCUMENT_FONT_FAMILY,
    ),
    italics: source.italic === true || overrides.italic === true,
    size: resolveDocxFontSize(fontSize, context.blockType),
    strike: source.strikethrough === true || overrides.strikethrough === true,
    underline: underline ? {} : undefined,
  });
}

function renderInlines(
  children: unknown[],
  context: {
    blockType: string;
    fontFamily?: string;
    fontSize?: string | number;
  },
  overrides: Record<string, unknown> = {},
): any[] {
  return children.flatMap((child) => {
    if (isTextNode(child)) {
      return [createTextRun(child, context, child.text, overrides)];
    }

    if (!isElementNode(child)) {
      return [];
    }

    if (child.type === "variable" || child.type === "template_variable") {
      const rawText =
        typeof child.value === "string"
          ? child.value
          : isTextNode(child.children[0])
            ? child.children[0].text
            : typeof child.fieldPath === "string"
              ? `{{${child.fieldPath}}}`
              : "";

      return [
        createTextRun(
          child,
          context,
          applyTextTransform(
            rawText,
            typeof child.textTransform === "string" ? child.textTransform : undefined,
          ),
          overrides,
        ),
      ];
    }

    if (child.type === "a") {
      return renderInlines(child.children, context, {
        ...overrides,
        color: "#2563eb",
        underline: true,
      });
    }

    return renderInlines(child.children, context, overrides);
  });
}

function createParagraphFromBlock(
  block: Record<string, unknown>,
  children: any[],
  extra: Record<string, unknown> = {},
) {
  const { indentLeftOverride, lineHeightOverride, ...paragraphExtras } = extra;
  const spacing = resolveDocxBlockSpacing(block.type);
  const indentLeft = resolveIndentTwips(
    typeof block.indent === "number" ? block.indent : undefined,
  );
  const lineHeight = resolveDocxLineHeight(
    block.lineHeight ?? lineHeightOverride ?? DEFAULT_DOCUMENT_LINE_HEIGHT,
  );
  const listLevel = Math.max(
    0,
    (typeof block.indent === "number" ? Math.round(block.indent) : 1) - 1,
  );

  return new Paragraph({
    alignment: mapAlignment(typeof block.align === "string" ? block.align : undefined),
    children: children.length > 0 ? children : [new TextRun("")],
    heading: resolveHeadingLevel(typeof block.type === "string" ? block.type : undefined),
    indent: {
      left: block.type === "blockquote" ? indentLeft + 480 : (indentLeftOverride ?? indentLeft),
    },
    numbering:
      block.listStyleType === "decimal"
        ? {
            level: listLevel,
            reference: DOCX_NUMBERING_REFERENCE,
          }
        : undefined,
    bullet: block.listStyleType === "disc" ? { level: listLevel } : undefined,
    spacing: {
      after: spacing.docxAfter,
      before: spacing.docxBefore,
      line: lineHeight,
      lineRule: LineRuleType.AUTO,
    },
    ...paragraphExtras,
  });
}

function renderTableCellChildren(
  cell: Record<string, unknown>,
  inheritedTableTypography: DocxTypographyContext = {},
) {
  const inheritedTypography: DocxTypographyContext = {
    fontFamily:
      typeof cell.fontFamily === "string" ? cell.fontFamily : inheritedTableTypography.fontFamily,
    fontSize:
      typeof cell.fontSize === "string" || typeof cell.fontSize === "number"
        ? cell.fontSize
        : inheritedTableTypography.fontSize,
    lineHeight:
      typeof cell.lineHeight === "string" || typeof cell.lineHeight === "number"
        ? cell.lineHeight
        : inheritedTableTypography.lineHeight,
  };
  const blockChildren = Array.isArray(cell.children) ? cell.children.filter(isElementNode) : [];

  if (blockChildren.length > 0) {
    return blocksToDocxElements(blockChildren, inheritedTypography);
  }

  return [
    createParagraphFromBlock(
      {
        align: cell.align,
        fontFamily: inheritedTypography.fontFamily,
        fontSize: inheritedTypography.fontSize,
        lineHeight: inheritedTypography.lineHeight,
        type: "p",
      },
      renderInlines(Array.isArray(cell.children) ? cell.children : [], {
        blockType: "p",
        fontFamily: inheritedTypography.fontFamily,
        fontSize: inheritedTypography.fontSize,
      }),
      {
        lineHeightOverride: inheritedTypography.lineHeight,
        spacing: {
          after: 0,
          before: 0,
          line: resolveDocxLineHeight(
            inheritedTypography.lineHeight ?? DEFAULT_DOCUMENT_LINE_HEIGHT,
          ),
          lineRule: LineRuleType.AUTO,
        },
      },
    ),
  ];
}

function blocksToDocxElements(
  blocks: unknown[],
  inheritedTypography: DocxTypographyContext = {},
): any[] {
  const elements: any[] = [];

  for (const block of blocks) {
    if (!isElementNode(block)) continue;

    const blockTypography: DocxTypographyContext = {
      fontFamily:
        typeof block.fontFamily === "string" ? block.fontFamily : inheritedTypography.fontFamily,
      fontSize:
        typeof block.fontSize === "string" || typeof block.fontSize === "number"
          ? block.fontSize
          : inheritedTypography.fontSize,
      lineHeight:
        typeof block.lineHeight === "string" || typeof block.lineHeight === "number"
          ? block.lineHeight
          : inheritedTypography.lineHeight,
    };

    if (block.type === "table") {
      const rows = block.children.filter(isElementNode).map((row) => {
        const rowCells = row.children.filter(isElementNode);

        return new TableRow({
          children: rowCells.map((cell) => {
            const width = rowCells.length > 0 ? 100 / rowCells.length : 100;

            return new TableCell({
              children: renderTableCellChildren(cell, blockTypography),
              width: { size: width, type: WidthType.PERCENTAGE },
            });
          }),
        });
      });

      elements.push(
        new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      );
      continue;
    }

    if (block.type === "img") {
      const altText =
        Array.isArray(block.children) && isTextNode(block.children[0])
          ? block.children[0].text
          : "Imagen";

      elements.push(
        createParagraphFromBlock({ ...block, type: "p" }, [
          createTextRun(
            {
              color: "#6b7280",
              italic: true,
            },
            {
              blockType: "p",
              fontFamily: blockTypography.fontFamily,
              fontSize: blockTypography.fontSize,
            },
            `[Imagen: ${altText}]`,
          ),
        ]),
      );
      continue;
    }

    const context = {
      blockType: block.type,
      fontFamily: blockTypography.fontFamily,
      fontSize: blockTypography.fontSize,
    };
    const inlines = renderInlines(block.children, context);

    elements.push(
      createParagraphFromBlock(
        {
          ...block,
          fontFamily: blockTypography.fontFamily,
          fontSize: blockTypography.fontSize,
          lineHeight: blockTypography.lineHeight,
        },
        inlines,
        {
          lineHeightOverride: blockTypography.lineHeight,
        },
      ),
    );
  }

  return elements;
}

Deno.serve(async (req) => {
  console.log("--- Document Exporter: Entry Point ---");
  console.log("Method:", req.method);

  if (req.method === "OPTIONS") {
    return await handleCORS(req);
  }

  try {
    const rawBody = await req.text();
    console.log("Incoming request body length:", rawBody.length);
    const { format, accountId, templateId, recordId, blocks, text } = JSON.parse(rawBody);
    console.log("Request fields:", {
      format,
      accountId,
      templateId,
      recordId,
      hasBlocks: !!blocks,
      hasText: !!text,
    });

    if (!format || !accountId || !templateId || !recordId || (!blocks && !text)) {
      return new Response(
        JSON.stringify({
          isError: true,
          error: `Missing required fields. Format: ${!!format}, Blocks: ${!!blocks}, AccountId: ${!!accountId}, TemplateId: ${!!templateId}, RecordId: ${!!recordId}`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    if (format === "pdf") {
      return new Response(
        JSON.stringify({
          isError: true,
          error: "PDF generation is not supported in the Edge Function. Use the Next.js API Route.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    let fileBytes: Uint8Array;
    const extension = format === "docx" ? "docx" : "txt";
    const mimeType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "text/plain";

    if (format === "docx" && blocks) {
      console.log("Generating native DOCX from blocks...");

      const doc = new Document({
        numbering: {
          config: [
            {
              levels: Array.from({ length: 6 }, (_, level) => ({
                format: LevelFormat.DECIMAL,
                level,
                style: {
                  paragraph: {
                    indent: {
                      hanging: 260,
                      left: 720 + level * 360,
                    },
                  },
                },
                text: `%${level + 1}.`,
              })),
              reference: DOCX_NUMBERING_REFERENCE,
            },
          ],
        },
        sections: [
          {
            children: blocksToDocxElements(blocks),
            properties: {},
          },
        ],
      });

      if (typeof Packer.toUint8Array === "function") {
        fileBytes = await Packer.toUint8Array(doc);
      } else if (typeof Packer.toBuffer === "function") {
        const buffer = await Packer.toBuffer(doc);
        fileBytes = new Uint8Array(buffer);
      } else {
        throw new Error("Packer does not support toUint8Array or toBuffer in this environment.");
      }
    } else {
      console.log("Falling back to plain text export...");
      fileBytes = new TextEncoder().encode(text || "");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);
    const fileName = `${accountId}/${templateId}/${recordId}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(fileName, fileBytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("exports")
      .createSignedUrl(fileName, 60 * 60);

    if (signedUrlError) {
      throw signedUrlError;
    }

    return new Response(JSON.stringify({ url: signedUrlData.signedUrl }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : "No stack trace";
    console.error("--- Edge Function Exception ---");
    console.error("Message:", message);
    console.error("Stack:", stack);

    return new Response(JSON.stringify({ isError: true, error: message }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
