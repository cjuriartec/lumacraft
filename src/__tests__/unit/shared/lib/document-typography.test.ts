import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOCUMENT_FONT_FAMILY,
  DEFAULT_DOCUMENT_FONT_SIZE,
  DEFAULT_DOCUMENT_LINE_HEIGHT,
  DOCUMENT_FONT_FAMILY_OPTIONS,
  normalizeSupportedDocumentFontFamily,
  resolveDocumentFontFamily,
  resolveDocumentFontSize,
  resolveDocumentLineHeight,
} from "@/shared/lib/document-typography";

describe("document-typography", () => {
  it("normalizes supported document font families and falls back safely", () => {
    expect(normalizeSupportedDocumentFontFamily("Arial")).toBe("arial");
    expect(normalizeSupportedDocumentFontFamily("Helvetica")).toBe("arial");
    expect(normalizeSupportedDocumentFontFamily("Roboto")).toBe("roboto");
    expect(normalizeSupportedDocumentFontFamily('"Times New Roman", Times, serif')).toBe("times");
    expect(normalizeSupportedDocumentFontFamily("Courier New")).toBe("courier");
    expect(normalizeSupportedDocumentFontFamily("Papyrus")).toBe(DEFAULT_DOCUMENT_FONT_FAMILY);
  });

  it("maps each supported family to web, pdf equivalents", () => {
    expect(resolveDocumentFontFamily("web", "arial")).toBe("Arial, Helvetica, sans-serif");
    expect(resolveDocumentFontFamily("pdf", "arial")).toBe("Helvetica");

    expect(resolveDocumentFontFamily("web", "roboto")).toBe(
      "var(--font-roboto), Arial, sans-serif",
    );
    expect(resolveDocumentFontFamily("pdf", "roboto")).toBe("Roboto");

    expect(resolveDocumentFontFamily("web", "times")).toBe('"Times New Roman", Times, serif');
    expect(resolveDocumentFontFamily("pdf", "times")).toBe("Times-Roman");

    expect(resolveDocumentFontFamily("web", "courier")).toBe('"Courier New", Courier, monospace');
    expect(resolveDocumentFontFamily("pdf", "courier")).toBe("Courier");
  });

  it("exposes single-name labels for the font picker", () => {
    expect(DOCUMENT_FONT_FAMILY_OPTIONS).toEqual([
      { label: "Arial", value: "arial" },
      { label: "Roboto", value: "roboto" },
      { label: "Times New Roman", value: "times" },
      { label: "Courier New", value: "courier" },
    ]);
  });

  it("resolves canonical block font sizes", () => {
    expect(resolveDocumentFontSize(undefined, "p")).toBe(DEFAULT_DOCUMENT_FONT_SIZE);
    expect(resolveDocumentFontSize(undefined, "h1")).toBe(36);
    expect(resolveDocumentFontSize(undefined, "h4")).toBe(18);
    expect(resolveDocumentFontSize("22px", "p")).toBe(22);
  });

  it("resolves and clamps line height consistently", () => {
    expect(resolveDocumentLineHeight(undefined)).toBe(DEFAULT_DOCUMENT_LINE_HEIGHT);
    expect(resolveDocumentLineHeight("2")).toBe(2);
    expect(resolveDocumentLineHeight("9")).toBe(3);
  });
});
