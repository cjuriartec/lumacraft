import { describe, expect, it, vi } from "vitest";

import { DEFAULT_PARAGRAPH_SPACE_AFTER } from "@/shared/lib/document-typography";
import {
  isParagraphSpacingEnabled,
  resolveParagraphSpacingToggleState,
  toggleParagraphSpacing,
} from "@/shared/presentation/components/ui/paragraph-spacing-toolbar-button";

function createEditor(block: Record<string, unknown>) {
  const unsetNodes = vi.fn();
  const setNodes = vi.fn();

  return {
    editor: {
      api: {
        block: () => [block, [0]],
      },
      tf: {
        setNodes,
        unsetNodes,
      },
    },
    setNodes,
    unsetNodes,
  };
}

describe("paragraph-spacing-toolbar-button helpers", () => {
  it("detects when paragraph spacing is enabled", () => {
    expect(isParagraphSpacingEnabled(8)).toBe(true);
    expect(isParagraphSpacingEnabled(0)).toBe(false);
    expect(isParagraphSpacingEnabled(undefined)).toBe(false);
  });

  it("treats the default paragraph spacing as enabled for spaceAfter", () => {
    expect(resolveParagraphSpacingToggleState({ type: "p" } as never, "spaceAfter")).toMatchObject({
      defaultValue: 8,
      effectiveValue: 8,
      isEnabled: true,
    });
    expect(resolveParagraphSpacingToggleState({ type: "p" } as never, "spaceBefore")).toMatchObject({
      defaultValue: 0,
      effectiveValue: 0,
      isEnabled: false,
    });
  });

  it("adds spacing before when the paragraph starts without it", () => {
    const { editor, setNodes, unsetNodes } = createEditor({ type: "p" });

    toggleParagraphSpacing(editor as never, "spaceBefore");

    expect(setNodes).toHaveBeenCalledWith({ spaceBefore: DEFAULT_PARAGRAPH_SPACE_AFTER }, { at: [0] });
    expect(unsetNodes).not.toHaveBeenCalled();
  });

  it("removes default spacing after by persisting an explicit zero", () => {
    const { editor, setNodes, unsetNodes } = createEditor({ type: "p" });

    toggleParagraphSpacing(editor as never, "spaceAfter");

    expect(setNodes).toHaveBeenCalledWith({ spaceAfter: 0 }, { at: [0] });
    expect(unsetNodes).not.toHaveBeenCalled();
  });

  it("restores default spacing after when it had been disabled", () => {
    const { editor, setNodes, unsetNodes } = createEditor({ type: "p", spaceAfter: 0 });

    toggleParagraphSpacing(editor as never, "spaceAfter");

    expect(unsetNodes).toHaveBeenCalledWith(["spaceAfter"], { at: [0] });
    expect(setNodes).not.toHaveBeenCalled();
  });

  it("removes custom spacing when the paragraph already has it", () => {
    const { editor, setNodes, unsetNodes } = createEditor({ type: "p", spaceBefore: 8 });

    toggleParagraphSpacing(editor as never, "spaceBefore");

    expect(setNodes).toHaveBeenCalledWith({ spaceBefore: 0 }, { at: [0] });
    expect(unsetNodes).not.toHaveBeenCalled();
  });
});
