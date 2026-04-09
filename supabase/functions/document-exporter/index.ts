/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
async function handleCORS(_req?: Request) {
  return new Response("ok", { headers: corsHeaders });
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import * as docx from "https://esm.sh/docx";
const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = docx;

/**
 * Maps Plate alignment to docx AlignmentType
 */
function mapAlignment(align?: string): AlignmentType {
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

/**
 * Renders inline children (text nodes, variables) to TextRuns
 */
function renderInlines(children: any[]): TextRun[] {
  return children.flatMap((child) => {
    if (child.text !== undefined) {
      return [
        new TextRun({
          text: child.text,
          bold: !!child.bold,
          italics: !!child.italic,
          strike: !!child.strikethrough,
          underline: child.underline ? {} : undefined,
          color: child.color?.replace("#", ""),
          size: child.fontSize ? child.fontSize * 2 : undefined, // docx uses half-points
        }),
      ];
    }
    if (child.type === "variable" || child.type === "template_variable") {
      return [
        new TextRun({
          text: child.value || `{{${child.fieldPath}}}`,
          bold: !!child.bold || true,
          color: child.color?.replace("#", "") || "4f46e5",
        }),
      ];
    }
    if (child.children) {
      return renderInlines(child.children);
    }
    return [];
  });
}

/**
 * Converts Plate blocks to docx elements
 */
function blocksToDocxElements(blocks: any[]): any[] {
  const elements: any[] = [];

  for (const block of blocks) {
    const inlines = renderInlines(block.children || []);
    const alignment = mapAlignment(block.align);

    switch (block.type) {
      case "h1":
        elements.push(
          new Paragraph({
            children: inlines,
            heading: HeadingLevel.HEADING_1,
            alignment,
            spacing: { before: 400, after: 200 },
          }),
        );
        break;
      case "h2":
        elements.push(
          new Paragraph({
            children: inlines,
            heading: HeadingLevel.HEADING_2,
            alignment,
            spacing: { before: 300, after: 150 },
          }),
        );
        break;
      case "h3":
        elements.push(
          new Paragraph({
            children: inlines,
            heading: HeadingLevel.HEADING_3,
            alignment,
            spacing: { before: 200, after: 100 },
          }),
        );
        break;
      case "blockquote":
        elements.push(
          new Paragraph({
            children: inlines,
            indent: { left: 720 },
            alignment,
          }),
        );
        break;
      case "table": {
        const rows = (block.children || []).map((row: any) => {
          const cells = (row.children || []).map((cell: any) => {
            return new TableCell({
              children: blocksToDocxElements(cell.children || []),
              width: { size: 100 / row.children.length, type: WidthType.PERCENTAGE },
            });
          });
          return new TableRow({ children: cells });
        });
        elements.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        break;
      }
      case "p":
      default:
        // Handle lists via listStyleType or type mapping (if applicable)
        elements.push(
          new Paragraph({
            children: inlines,
            alignment,
            spacing: { after: 120 },
          }),
        );
        break;
    }
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
      // PDF is now handled server-side in the Next.js API Route.
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

    // Content Processing
    let fileBytes: Uint8Array;
    const extension = format === "docx" ? "docx" : "txt";
    const mimeType =
      format === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "text/plain";

    if (format === "docx" && blocks) {
      console.log("Generating native DOCX from blocks...");
      console.log("Packer keys:", Object.keys(Packer || {}));

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: blocksToDocxElements(blocks),
          },
        ],
      });

      // Attempt to generate the file using available Packer methods
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
      const encoder = new TextEncoder();
      fileBytes = encoder.encode(text || "");
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
      .createSignedUrl(fileName, 60 * 60); // 1 hr

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
