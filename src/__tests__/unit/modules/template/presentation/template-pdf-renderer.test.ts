/**
 * Unit tests for the template PDF renderer.
 *
 * The renderer is configured with built-in PDF fonts for Arial/Times/Courier
 * equivalents, and a local Roboto registration when that family is selected.
 * Therefore, no network mocking is needed.
 *
 * All assertions check that the function returns a valid PDF binary
 * (confirmed by the %PDF magic bytes), proving that each block type is
 * handled without throwing.
 */

import { beforeAll, describe, expect, it, vi } from "vitest";

import type { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import {
  formatPdfLinkDisplayText,
  PDF_TABLE_CELL_PADDING_HORIZONTAL,
  PDF_TABLE_CELL_PADDING_VERTICAL,
  renderTemplateToPdfBuffer,
  resolvePdfBlockSpacingForRenderMode,
  resolvePdfFontFamily,
  resolvePdfTextAlign,
} from "@/modules/template/presentation/lib/template-pdf-renderer";

const PDF_MAGIC_BYTES = "%PDF";
const TINY_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z0wAAAABJRU5ErkJggg==";

function getPdfHeader(buffer: Buffer): string {
  return buffer.subarray(0, 8).toString("ascii");
}

describe("renderTemplateToPdfBuffer", () => {
  beforeAll(() => {
    // Suppress react-pdf console warnings in test output
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns a valid PDF for empty blocks", async () => {
    const result = await renderTemplateToPdfBuffer([]);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("returns a valid PDF for null/undefined blocks", async () => {
    const result = await renderTemplateToPdfBuffer(null as unknown as TemplateBlocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders a document with headings (h1–h3)", async () => {
    const blocks: TemplateBlocks = [
      { type: "h1", children: [{ text: "Main Title" }] },
      { type: "h2", children: [{ text: "Sub Title" }] },
      { type: "h3", children: [{ text: "Section" }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders h4, h5, h6 headings", async () => {
    const blocks: TemplateBlocks = [
      { type: "h4", children: [{ text: "h4" }] },
      { type: "h5", children: [{ text: "h5" }] },
      { type: "h6", children: [{ text: "h6" }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders paragraph blocks", async () => {
    const blocks: TemplateBlocks = [
      { type: "p", children: [{ text: "Hello, world!" }] },
      { type: "p", children: [{ text: "Second paragraph." }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders blockquote blocks", async () => {
    const blocks: TemplateBlocks = [
      { type: "blockquote", children: [{ text: "This is a quote." }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders bullet list items", async () => {
    const blocks: TemplateBlocks = [
      { type: "p", listStyleType: "disc", indent: 1, children: [{ text: "Item one" }] },
      { type: "p", listStyleType: "disc", indent: 1, children: [{ text: "Item two" }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders numbered list items", async () => {
    const blocks: TemplateBlocks = [
      { type: "p", listStyleType: "decimal", indent: 1, children: [{ text: "First" }] },
      { type: "p", listStyleType: "decimal", indent: 1, children: [{ text: "Second" }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders inline marks (bold, italic, underline, code, color, fontSize)", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [
          { text: "Normal " },
          { text: "Bold", bold: true },
          { text: " " },
          { text: "Italic", italic: true },
          { text: " " },
          { text: "Underlined", underline: true },
          { text: " " },
          { text: "code()", code: true },
          { text: " " },
          { text: "Colored", color: "#e63946" },
          { text: " " },
          { text: "Big", fontSize: 18 },
        ],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders a horizontal rule (hr block)", async () => {
    const blocks: TemplateBlocks = [
      { type: "p", children: [{ text: "Before" }] },
      { type: "hr", children: [] },
      { type: "p", children: [{ text: "After" }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders a table with header and data cells", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "table",
        children: [
          {
            type: "tr",
            children: [
              { type: "th", children: [{ text: "Name" }] },
              { type: "th", children: [{ text: "Value" }] },
            ],
          },
          {
            type: "tr",
            children: [
              { type: "td", children: [{ text: "Alpha" }] },
              { type: "td", children: [{ text: "1" }] },
            ],
          },
        ],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles lineHeight in table cells", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "table",
        lineHeight: 2.5,
        children: [
          {
            type: "tr",
            children: [{ type: "td", children: [{ text: "Tall row content" }] }],
          },
        ],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("uses the updated compact padding values for PDF table cells", () => {
    expect(PDF_TABLE_CELL_PADDING_HORIZONTAL).toBe(5);
    expect(PDF_TABLE_CELL_PADDING_VERTICAL).toBe(4);
  });

  it("uses tighter spacing for blocks rendered inside table cells", () => {
    expect(resolvePdfBlockSpacingForRenderMode("p", "body")).toEqual({
      pdfMarginBottom: 8,
      pdfMarginTop: 0,
    });
    expect(resolvePdfBlockSpacingForRenderMode("p", "tableCell")).toEqual({
      pdfMarginBottom: 0,
      pdfMarginTop: 0,
    });
    expect(resolvePdfBlockSpacingForRenderMode("h2", "tableCell")).toEqual({
      pdfMarginBottom: 3,
      pdfMarginTop: 2,
    });
  });

  it("renders paragraph blocks with custom spaceBefore and spaceAfter", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        spaceBefore: 8,
        spaceAfter: 10,
        children: [{ text: "Con espaciado personalizado" }],
      },
    ];

    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("skips image block if src is missing (no error thrown)", async () => {
    const blocks: TemplateBlocks = [
      { type: "img", children: [{ text: "" }] }, // no url/path
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("embeds document title in PDF metadata", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Content" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "My Report");
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles strikethrough and highlight marks", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [
          { text: "Strike", strikethrough: true },
          { text: " Highlight", highlight: true },
        ],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles backgroundColor on text nodes", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [{ text: "Background", backgroundColor: "#FFF176" }],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles align and lineHeight on paragraph blocks", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        align: "center",
        lineHeight: 2,
        children: [{ text: "Centered with double line height" }],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles right and justify alignment", async () => {
    const blocks: TemplateBlocks = [
      { type: "p", align: "right", children: [{ text: "Right" }] },
      { type: "p", align: "justify", children: [{ text: "Justified" }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("keeps justify alignment for plain paragraphs without risky inline content", () => {
    expect(
      resolvePdfTextAlign({
        align: "justify",
        children: [{ text: "Texto plano sin enlaces ni tokens largos." }],
      }),
    ).toBe("justify");
  });

  it("keeps justify alignment for justified paragraphs with inline links once the link can wrap", () => {
    expect(
      resolvePdfTextAlign({
        align: "justify",
        children: [
          { text: "Para referencia técnica, revisar " },
          {
            type: "a",
            url: "https://git.mtc.gob.pe/equipo-odtd/equipo-chinchay/srfitac/tefi.git",
            children: [
              {
                text: "https://git.mtc.gob.pe/equipo-odtd/equipo-chinchay/srfitac/tefi.git",
              },
            ],
          },
        ],
      }),
    ).toBe("justify");
  });

  it("falls back to left alignment for justified paragraphs with long unbreakable tokens", () => {
    expect(
      resolvePdfTextAlign({
        align: "justify",
        children: [{ text: "token-super-largo-para-forzar-un-corte-problematico-en-pdf" }],
      }),
    ).toBe("left");
  });

  it("adds soft break opportunities to long URL labels in PDF links", () => {
    expect(
      formatPdfLinkDisplayText(
        "https://git.mtc.gob.pe/equipo-odtd/equipo-chinchay/srfitac/tefi.git",
      ),
    ).toContain("\u200B");
  });

  it("keeps short link labels untouched", () => {
    expect(formatPdfLinkDisplayText("Lumacraft")).toBe("Lumacraft");
  });

  it("handles non-array blocks gracefully", async () => {
    const result = await renderTemplateToPdfBuffer("not-an-array" as unknown as TemplateBlocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders header and footer images from normalized remote sources", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Doc", {
      header: {
        enabled: true,
        blocks: [{ type: "img", url: TINY_PNG_DATA_URL, children: [{ text: "" }] }],
      },
      footer: {
        enabled: true,
        blocks: [{ type: "img", path: TINY_PNG_DATA_URL, children: [{ text: "" }] }],
      },
    });

    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles inline link (anchor) nodes", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [
          { text: "Visit " },
          {
            type: "a",
            url: "https://example.com",
            children: [{ text: "Example" }],
          },
        ],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles color values without # prefix (bare hex)", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        children: [{ text: "Red text", color: "FF0000" }],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles indented blocks", async () => {
    const blocks: TemplateBlocks = [
      { type: "p", indent: 2, children: [{ text: "Indented paragraph" }] },
      { type: "h2", indent: 1, children: [{ text: "Indented heading" }] },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles variable formatting (bold, italic, color, textTransform, fontFamily)", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        fontFamily: "times",
        children: [
          {
            type: "variable",
            fieldPath: "nombre",
            bold: true,
            italic: true,
            color: "#ff0000",
            fontFamily: "times",
            fontSize: "20px",
            textTransform: "uppercase",
            children: [{ text: "JUAN" }],
          },
        ],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders Roboto when that family is selected", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "p",
        fontFamily: "roboto",
        children: [{ text: "Texto en Roboto " }, { text: "negrita", bold: true }],
      },
    ];

    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("uses the registered Arial PDF font when Arial is selected", () => {
    expect(resolvePdfFontFamily("arial")).toBe("Arial");
    expect(resolvePdfFontFamily("Arial")).toBe("Arial");
  });

  it("respects persisted width and height fields for PDF images", async () => {
    const blocks: TemplateBlocks = [
      {
        type: "img",
        height: 180,
        url: TINY_PNG_DATA_URL,
        width: "42%",
        children: [{ text: "" }],
      },
    ];

    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles logic block styles (compiled)", async () => {
    // Compiled logic blocks are standard nodes with inherited styles
    const blocks: TemplateBlocks = [
      {
        type: "p",
        align: "right",
        lineHeight: 2.0,
        indent: 1,
        children: [{ text: "Generated content" }],
      },
    ];
    const result = await renderTemplateToPdfBuffer(blocks);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });
});

describe("renderTemplateToPdfBuffer — pageConfig (header/footer)", () => {
  it("is backward compatible: renders without pageConfig", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body only" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Test", null);
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders with an enabled header", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Doc", {
      header: {
        enabled: true,
        blocks: [{ type: "p", children: [{ text: "Empresa SRL" }] }],
      },
    });
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders with an enabled footer", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Doc", {
      footer: {
        enabled: true,
        blocks: [{ type: "p", children: [{ text: "Pie de página" }] }],
      },
    });
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("renders with both header and footer enabled", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Contenido" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Informe", {
      header: {
        enabled: true,
        blocks: [{ type: "p", children: [{ text: "Cabecera" }] }],
        height: 60,
      },
      footer: {
        enabled: true,
        blocks: [{ type: "p", children: [{ text: "Pié" }] }],
        height: 45,
      },
    });
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("skips disabled header/footer sections", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Doc", {
      header: { enabled: false, blocks: [{ type: "p", children: [{ text: "Ignored" }] }] },
      footer: { enabled: false, blocks: [] },
    });
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("resolves $page_number system variable in header", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Doc", {
      header: {
        enabled: true,
        blocks: [
          {
            type: "p",
            children: [
              {
                type: "variable",
                fieldPath: "$page_number",
                fieldType: "TEXT",
                children: [{ text: "Pág." }],
              },
            ],
          },
        ],
      },
    });
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("resolves $total_pages, $current_date, $template_name system variables in footer", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Mi Plantilla", {
      footer: {
        enabled: true,
        blocks: [
          {
            type: "p",
            children: [
              {
                type: "variable",
                fieldPath: "$total_pages",
                fieldType: "TEXT",
                children: [{ text: "" }],
              },
              { text: " | " },
              {
                type: "variable",
                fieldPath: "$current_date",
                fieldType: "TEXT",
                children: [{ text: "" }],
              },
              { text: " | " },
              {
                type: "variable",
                fieldPath: "$template_name",
                fieldType: "TEXT",
                children: [{ text: "" }],
              },
            ],
          },
        ],
      },
    });
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });

  it("handles empty header blocks gracefully", async () => {
    const blocks: TemplateBlocks = [{ type: "p", children: [{ text: "Body" }] }];
    const result = await renderTemplateToPdfBuffer(blocks, "Doc", {
      header: { enabled: true, blocks: [] },
    });
    expect(getPdfHeader(result)).toContain(PDF_MAGIC_BYTES);
  });
});
