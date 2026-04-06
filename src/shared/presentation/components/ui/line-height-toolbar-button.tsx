"use client";

import { LineHeightPlugin } from "@platejs/basic-styles/react";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { MoveVertical } from "lucide-react";
import { useEditorPlugin, useSelectionFragmentProp } from "platejs/react";
import * as React from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";

import { ToolbarButton } from "./toolbar";

export function LineHeightToolbarButton(props: DropdownMenuProps) {
  const { editor, tf } = useEditorPlugin(LineHeightPlugin);
  const value =
    useSelectionFragmentProp({
      defaultValue: "1.5",
      getProp: (node) => node.lineHeight?.toString(),
    }) ?? "1.5";

  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Line height" isDropdown className="min-w-10">
          <MoveVertical className="size-4" />
          {value !== "1.5" && (
            <span className="mr-1 text-[11px] font-semibold text-muted-foreground">{value}</span>
          )}
        </ToolbarButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-0" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(value) => {
            tf.lineHeight.setNodes(Number(value));
            editor.tf.focus();
          }}
        >
          {[1, 1.15, 1.5, 2, 2.5, 3].map((itemValue) => (
            <DropdownMenuRadioItem
              key={itemValue}
              className="cursor-pointer transition-colors pl-2 focus:bg-primary/10 focus:text-primary data-[state=checked]:font-bold data-[state=checked]:text-primary [&>span:first-child]:hidden"
              value={itemValue.toString()}
            >
              <span className="text-xs">{itemValue}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
