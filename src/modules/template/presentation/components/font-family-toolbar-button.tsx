"use client";

import { FontFamilyPlugin } from "@platejs/basic-styles/react";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { Type } from "lucide-react";
import { useEditorPlugin, useSelectionFragmentProp } from "platejs/react";
import * as React from "react";

import { applyFontFamilyToSelectedBlocks } from "@/modules/template/presentation/lib/template-editor-formatting";
import {
  DEFAULT_DOCUMENT_FONT_FAMILY,
  DOCUMENT_FONT_FAMILY_OPTIONS,
  normalizeSupportedDocumentFontFamily,
} from "@/shared/lib/document-typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import { ToolbarButton } from "@/shared/presentation/components/ui/toolbar";

export function FontFamilyToolbarButton(props: DropdownMenuProps) {
  const { editor } = useEditorPlugin(FontFamilyPlugin);
  const [open, setOpen] = React.useState(false);

  const value =
    useSelectionFragmentProp({
      defaultValue: DEFAULT_DOCUMENT_FONT_FAMILY,
      getProp: (node) => {
        if (!("type" in node) || typeof node.fontFamily !== "string") {
          return undefined;
        }

        return normalizeSupportedDocumentFontFamily(node.fontFamily);
      },
    }) ?? DEFAULT_DOCUMENT_FONT_FAMILY;

  const selectedOption =
    DOCUMENT_FONT_FAMILY_OPTIONS.find((option) => option.value === value) ??
    DOCUMENT_FONT_FAMILY_OPTIONS[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Familia tipográfica" isDropdown className="min-w-36">
          <Type className="size-4" />
          <span className="truncate">{selectedOption.label}</span>
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[220px]" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => {
            applyFontFamilyToSelectedBlocks(editor, nextValue);
          }}
        >
          {DOCUMENT_FONT_FAMILY_OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="pl-2 data-[state=checked]:bg-accent *:first:[span]:hidden"
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
