"use client";

import { BetweenHorizontalStart } from "lucide-react";
import type { TElement } from "platejs";
import { useEditorRef, useEditorSelector } from "platejs/react";
import * as React from "react";

import {
  DEFAULT_PARAGRAPH_SPACE_AFTER,
  DEFAULT_PARAGRAPH_SPACE_BEFORE,
} from "@/shared/lib/document-typography";
import { cn } from "@/shared/lib/utils";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ToolbarButton } from "./toolbar";

type ParagraphSpacingKey = "spaceBefore" | "spaceAfter";

type ParagraphEditor = ReturnType<typeof useEditorRef>;

function getDefaultParagraphSpacing(key: ParagraphSpacingKey) {
  return key === "spaceBefore" ? DEFAULT_PARAGRAPH_SPACE_BEFORE : DEFAULT_PARAGRAPH_SPACE_AFTER;
}

function getCurrentParagraphBlock(editor: ParagraphEditor) {
  const entry = editor.api.block<TElement>();
  if (!entry) return null;

  const [block, path] = entry;
  if (block.type !== "p") return null;

  return { block, path };
}

function isParagraphSpacingEnabled(value: unknown) {
  return typeof value === "number" && value > 0;
}

function resolveParagraphSpacingToggleState(block: TElement, key: ParagraphSpacingKey) {
  const explicitValue = block[key];
  const defaultValue = getDefaultParagraphSpacing(key);
  const effectiveValue =
    typeof explicitValue === "number" ? Math.max(0, explicitValue) : defaultValue;

  return {
    defaultValue,
    effectiveValue,
    isEnabled: effectiveValue > 0,
  };
}

function toggleParagraphSpacing(editor: ParagraphEditor, key: ParagraphSpacingKey) {
  const current = getCurrentParagraphBlock(editor);
  if (!current) return;

  const spacingState = resolveParagraphSpacingToggleState(current.block, key);
  if (spacingState.isEnabled) {
    editor.tf.setNodes({ [key]: 0 }, { at: current.path });
    return;
  }

  if (spacingState.defaultValue > 0) {
    editor.tf.unsetNodes([key], { at: current.path });
    return;
  }

  editor.tf.setNodes({ [key]: DEFAULT_PARAGRAPH_SPACE_AFTER }, { at: current.path });
}

export function ParagraphSpacingToolbarButton() {
  const editor = useEditorRef();
  const spacingState = useEditorSelector((currentEditor) => {
    const entry = currentEditor.api.block<TElement>();
    if (!entry) {
      return { hasSpaceAfter: false, hasSpaceBefore: false, isParagraph: false };
    }

    const [block] = entry;
    if (block.type !== "p") {
      return { hasSpaceAfter: false, hasSpaceBefore: false, isParagraph: false };
    }

    return {
      hasSpaceAfter: resolveParagraphSpacingToggleState(block, "spaceAfter").isEnabled,
      hasSpaceBefore: resolveParagraphSpacingToggleState(block, "spaceBefore").isEnabled,
      isParagraph: true,
    };
  }, []);
  const [open, setOpen] = React.useState(false);

  const handleToggle = React.useCallback(
    (key: ParagraphSpacingKey) => {
      toggleParagraphSpacing(editor, key);
      editor.tf.focus();
    },
    [editor],
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <ToolbarButton
          disabled={!spacingState.isParagraph}
          pressed={open}
          tooltip="Espaciado de párrafo"
          isDropdown
          className={cn("min-w-10", !spacingState.isParagraph && "opacity-50")}
        >
          <BetweenHorizontalStart className="size-4" />
        </ToolbarButton>
      </PopoverTrigger>

      <PopoverContent className="w-52 space-y-2 p-2" align="start">
        <button
          type="button"
          disabled={!spacingState.isParagraph}
          onClick={() => handleToggle("spaceBefore")}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
            spacingState.hasSpaceBefore
              ? "bg-primary/10 text-primary"
              : "hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <span>{spacingState.hasSpaceBefore ? "Quitar espacio antes" : "Agregar espacio antes"}</span>
        </button>

        <button
          type="button"
          disabled={!spacingState.isParagraph}
          onClick={() => handleToggle("spaceAfter")}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
            spacingState.hasSpaceAfter
              ? "bg-primary/10 text-primary"
              : "hover:bg-accent hover:text-accent-foreground",
          )}
        >
          <span>{spacingState.hasSpaceAfter ? "Quitar espacio después" : "Agregar espacio después"}</span>
        </button>
      </PopoverContent>
    </Popover>
  );
}

export {
  getDefaultParagraphSpacing,
  isParagraphSpacingEnabled,
  resolveParagraphSpacingToggleState,
  toggleParagraphSpacing,
};
