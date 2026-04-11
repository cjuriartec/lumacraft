import { describe, expect, it, vi } from "vitest";

import {
  applyFontFamilyToSelectedBlocks,
  applyFormattingToVariableNodesInSelection,
  getCurrentVariableFormatting,
} from "@/modules/template/presentation/lib/template-editor-formatting";

function createMockEditor() {
  const selection = { anchor: { offset: 0, path: [0, 0] }, focus: { offset: 4, path: [0, 1] } };
  const blockEntries = [[{ type: "p" }, [0]]] as Array<[Record<string, unknown>, number[]]>;
  const blockDescendants = [
    [{ text: "Hola" }, [0, 0]],
    [{ type: "variable", fieldPath: "nombre", children: [{ text: "" }] }, [0, 1]],
  ] as Array<[Record<string, unknown>, number[]]>;

  const setNodes = vi.fn();
  const addMarks = vi.fn();
  const focus = vi.fn();

  const editor = {
    selection,
    api: {
      block: vi.fn(() => [{ type: "p", fontFamily: "times" }, [0]]),
      blocks: vi.fn(() => blockEntries),
      marks: vi.fn(() => ({
        bold: true,
        fontFamily: "Helvetica",
        fontSize: "18px",
        underline: true,
      })),
      nodes: vi.fn(({ at, match }: { at: unknown; match: (node: unknown) => boolean }) => {
        if (at === selection) {
          return blockDescendants.filter(([node]) => match(node));
        }

        if (JSON.stringify(at) === JSON.stringify([0])) {
          return blockDescendants.filter(([node]) => match(node));
        }

        return [];
      }),
    },
    tf: {
      addMarks,
      focus,
      setNodes,
      withoutNormalizing: (callback: () => void) => callback(),
    },
  };

  return { addMarks, editor, focus, selection, setNodes };
}

describe("template-editor-formatting", () => {
  it("applies the selected font family to blocks, text leaves and inline variables", () => {
    const { addMarks, editor, focus, setNodes } = createMockEditor();

    applyFontFamilyToSelectedBlocks(editor as never, "Times New Roman");

    expect(setNodes).toHaveBeenCalledWith({ fontFamily: "times" }, { at: [0] });
    expect(setNodes).toHaveBeenCalledWith({ fontFamily: "times" }, { at: [0, 0] });
    expect(setNodes).toHaveBeenCalledWith({ fontFamily: "times" }, { at: [0, 1] });
    expect(addMarks).toHaveBeenCalledWith({ fontFamily: "times" });
    expect(focus).toHaveBeenCalled();
  });

  it("applies inline formatting patches to variable nodes inside the current selection", () => {
    const { editor, setNodes } = createMockEditor();

    applyFormattingToVariableNodesInSelection(editor as never, {
      fontFamily: "Helvetica",
      fontSize: "24px",
    });

    expect(setNodes).toHaveBeenCalledWith(
      { fontFamily: "arial", fontSize: "24px" },
      { at: [0, 1] },
    );
  });

  it("extracts current marks to initialize newly inserted variables", () => {
    const { editor } = createMockEditor();

    expect(getCurrentVariableFormatting(editor as never)).toEqual({
      bold: true,
      fontFamily: "arial",
      fontSize: "18px",
      underline: true,
    });
  });
});
