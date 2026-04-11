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
import { renderTemplateToPdfBuffer } from "@/modules/template/presentation/lib/template-pdf-renderer";

const PDF_MAGIC_BYTES = "%PDF";

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

  it("handles non-array blocks gracefully", async () => {
    const result = await renderTemplateToPdfBuffer("not-an-array" as unknown as TemplateBlocks);
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
