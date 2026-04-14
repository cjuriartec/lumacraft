import { describe, expect, it } from "vitest";

import {
  DEFAULT_FOOTER_HEIGHT,
  DEFAULT_HEADER_HEIGHT,
  isPdfPageConfig,
  type PdfPageConfig,
} from "@/modules/template/domain/types/pdf-page-config";

describe("isPdfPageConfig", () => {
  it("returns true for null (no config)", () => {
    expect(isPdfPageConfig(null)).toBe(true);
  });

  it("returns true for undefined (no config)", () => {
    expect(isPdfPageConfig(undefined)).toBe(true);
  });

  it("returns true for an empty config object", () => {
    expect(isPdfPageConfig({})).toBe(true);
  });

  it("returns true for a config with an enabled header and valid blocks", () => {
    const config: PdfPageConfig = {
      header: { enabled: true, blocks: [{ type: "p", children: [{ text: "Header" }] }] },
    };
    expect(isPdfPageConfig(config)).toBe(true);
  });

  it("returns true for a config with both header and footer", () => {
    const config: PdfPageConfig = {
      header: {
        enabled: true,
        blocks: [{ type: "p", children: [{ text: "Header" }] }],
        height: 60,
      },
      footer: {
        enabled: false,
        blocks: [],
        height: DEFAULT_FOOTER_HEIGHT,
      },
    };
    expect(isPdfPageConfig(config)).toBe(true);
  });

  it("returns true for a disabled header with empty blocks", () => {
    const config: PdfPageConfig = {
      header: { enabled: false, blocks: [] },
    };
    expect(isPdfPageConfig(config)).toBe(true);
  });

  it("returns false for a non-object value", () => {
    expect(isPdfPageConfig("invalid")).toBe(false);
    expect(isPdfPageConfig(42)).toBe(false);
    expect(isPdfPageConfig(true)).toBe(false);
    expect(isPdfPageConfig([])).toBe(false);
  });

  it("returns false when header.enabled is not a boolean", () => {
    expect(isPdfPageConfig({ header: { enabled: "yes", blocks: [] } })).toBe(false);
  });

  it("returns false when header.blocks is not an array", () => {
    expect(isPdfPageConfig({ header: { enabled: true, blocks: "invalid" } })).toBe(false);
  });

  it("returns false when header.height is present but not a number", () => {
    expect(isPdfPageConfig({ header: { enabled: true, blocks: [], height: "sixty" } })).toBe(false);
  });

  it("exposes correct default heights", () => {
    expect(DEFAULT_HEADER_HEIGHT).toBe(50);
    expect(DEFAULT_FOOTER_HEIGHT).toBe(40);
  });
});
