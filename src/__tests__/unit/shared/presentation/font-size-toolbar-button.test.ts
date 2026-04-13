import { describe, expect, it } from "vitest";

import { resolveDisplayedFontSize } from "@/shared/presentation/components/ui/font-size-toolbar-button";

describe("resolveDisplayedFontSize", () => {
  it("prefers selected text marks when available", () => {
    expect(
      resolveDisplayedFontSize({
        block: { type: "p", fontSize: "11pt" },
        marksFontSize: "13pt",
      }),
    ).toBe("13");
  });

  it("falls back to the current block font size inside table cells", () => {
    expect(
      resolveDisplayedFontSize({
        block: { type: "p", fontSize: "11pt" },
      }),
    ).toBe("11");
  });

  it("uses heading defaults when no explicit size is present", () => {
    expect(
      resolveDisplayedFontSize({
        block: { type: "h2" },
      }),
    ).toBe("24");
  });

  it("returns the default size when neither marks nor block size exist", () => {
    expect(resolveDisplayedFontSize({ block: { type: "p" } })).toBe("16");
  });
});
