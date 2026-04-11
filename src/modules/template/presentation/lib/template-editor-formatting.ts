"use client";

import type { Path, TElement, TText } from "platejs";
import type { PlateEditor } from "platejs/react";

import { normalizeSupportedDocumentFontFamily } from "@/shared/lib/document-typography";

type VariableFormattingPatch = {
  backgroundColor?: string;
  bold?: boolean;
  color?: string;
  fontFamily?: string;
  fontSize?: string | number;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTextNode(value: unknown): value is TText {
  return isRecord(value) && typeof value.text === "string";
}

function isElementNode(value: unknown): value is TElement {
  return isRecord(value) && typeof value.type === "string" && Array.isArray(value.children);
}

function isVariableNode(value: unknown): value is TElement {
  return isElementNode(value) && value.type === "variable";
}

function toNodeEntries(editor: PlateEditor, at: Path | PlateEditor["selection"]) {
  return Array.from(
    editor.api.nodes({
      at,
      match: (node) => isTextNode(node) || isVariableNode(node),
      mode: "all",
    }),
  );
}

function pickDefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Partial<T>;
}

export function applyFormattingToVariableNodesInSelection(
  editor: PlateEditor,
  patch: VariableFormattingPatch,
) {
  if (!editor.selection) return;

  const normalizedPatch = pickDefined({
    ...patch,
    ...(patch.fontFamily
      ? { fontFamily: normalizeSupportedDocumentFontFamily(patch.fontFamily) }
      : {}),
  });

  if (Object.keys(normalizedPatch).length === 0) return;

  const entries = Array.from(
    editor.api.nodes({
      at: editor.selection,
      match: isVariableNode,
      mode: "all",
    }),
  );

  if (entries.length === 0) return;

  editor.tf.withoutNormalizing(() => {
    for (const [, path] of entries) {
      editor.tf.setNodes(normalizedPatch, { at: path });
    }
  });
}

export function applyFontFamilyToSelectedBlocks(editor: PlateEditor, fontFamily: string) {
  const normalizedFontFamily = normalizeSupportedDocumentFontFamily(fontFamily);
  const blockEntries = Array.from(editor.api.blocks<TElement>({ mode: "lowest" }));
  const currentBlock = editor.api.block<TElement>();
  const targetBlocks = blockEntries.length > 0 ? blockEntries : currentBlock ? [currentBlock] : [];

  if (targetBlocks.length === 0) {
    return;
  }

  editor.tf.withoutNormalizing(() => {
    for (const [, path] of targetBlocks) {
      editor.tf.setNodes({ fontFamily: normalizedFontFamily }, { at: path });

      for (const [node, childPath] of toNodeEntries(editor, path)) {
        if (isTextNode(node) || isVariableNode(node)) {
          editor.tf.setNodes({ fontFamily: normalizedFontFamily }, { at: childPath });
        }
      }
    }

    editor.tf.addMarks({ fontFamily: normalizedFontFamily });
  });

  editor.tf.focus();
}

export function getCurrentVariableFormatting(editor: PlateEditor): VariableFormattingPatch {
  const marks = (editor.api.marks() ?? {}) as Record<string, unknown>;
  const [currentBlock] = editor.api.block<TElement>() ?? [];

  return pickDefined({
    backgroundColor: typeof marks.backgroundColor === "string" ? marks.backgroundColor : undefined,
    bold: marks.bold === true ? true : undefined,
    color: typeof marks.color === "string" ? marks.color : undefined,
    fontFamily:
      typeof marks.fontFamily === "string"
        ? normalizeSupportedDocumentFontFamily(marks.fontFamily)
        : typeof currentBlock?.fontFamily === "string"
          ? normalizeSupportedDocumentFontFamily(currentBlock.fontFamily)
          : undefined,
    fontSize:
      typeof marks.fontSize === "string" || typeof marks.fontSize === "number"
        ? marks.fontSize
        : undefined,
    italic: marks.italic === true ? true : undefined,
    strikethrough: marks.strikethrough === true ? true : undefined,
    underline: marks.underline === true ? true : undefined,
  });
}
