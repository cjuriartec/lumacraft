"use client";

import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { PlateContentProps, PlateViewProps } from "platejs/react";
import { PlateContainer, PlateContent, PlateView } from "platejs/react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";

const editorContainerVariants = cva(
  "relative w-full cursor-text select-text overflow-y-auto caret-primary selection:bg-brand/25 focus-visible:outline-none [&_.slate-selection-area]:z-50 [&_.slate-selection-area]:border [&_.slate-selection-area]:border-brand/25 [&_.slate-selection-area]:bg-brand/15",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        comment: cn(
          "flex flex-wrap justify-between gap-1 px-1 py-0.5 text-sm",
          "rounded-md border-[1.5px] border-transparent bg-transparent",
          "has-[[data-slate-editor]:focus]:border-brand/50 has-[[data-slate-editor]:focus]:ring-2 has-[[data-slate-editor]:focus]:ring-brand/30",
          "has-aria-disabled:border-input has-aria-disabled:bg-muted",
        ),
        default: "min-h-full",
        demo: "min-h-[calc(100vh-200px)]",
        select: cn(
          "group rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          "has-data-readonly:w-fit has-data-readonly:cursor-default has-data-readonly:border-transparent has-data-readonly:focus-within:[box-shadow:none]",
        ),
      },
    },
  },
);

import { LinkFloatingToolbar } from "@/shared/presentation/components/ui/link-floating-toolbar";

export function EditorContainer({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof editorContainerVariants>) {
  return (
    <PlateContainer
      className={cn(
        "ignore-click-outside/toolbar",
        editorContainerVariants({ variant }),
        className,
      )}
      {...props}
    >
      {props.children}
      <LinkFloatingToolbar />
    </PlateContainer>
  );
}

const editorVariants = cva(
  cn(
    "group/editor",
    "relative w-full cursor-text select-text overflow-x-hidden whitespace-pre-wrap break-words",
    "rounded-md ring-offset-background focus-visible:outline-none",
    "**:data-slate-placeholder:!top-1/2 **:data-slate-placeholder:-translate-y-1/2 placeholder:text-foreground/25 **:data-slate-placeholder:text-foreground/25 **:data-slate-placeholder:opacity-100!",
    "[&_strong]:font-bold",
  ),
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      disabled: {
        true: "cursor-not-allowed opacity-50",
      },
      focused: {
        true: "ring-2 ring-ring ring-offset-2",
      },
      variant: {
        ai: "w-full px-0 text-base md:text-sm",
        aiChat: "max-h-[min(70vh,320px)] w-full overflow-y-auto px-3 py-2 text-base md:text-sm",
        comment: cn("rounded-none border-none bg-transparent text-sm"),
        default:
          "size-full px-16 pt-16 pb-72 text-base sm:px-[max(64px,calc(50%-350px))] bg-surface shadow-sm border border-border/50 rounded-xl",
        demo: "size-full px-16 pt-16 pb-72 text-base sm:px-[max(64px,calc(50%-350px))] bg-surface shadow-sm border border-border/50 rounded-xl",
        fullWidth:
          "size-full px-16 pt-16 pb-72 text-base sm:px-24 bg-surface shadow-sm border border-border/50 rounded-xl",
        // A4 variant: replicates the exact PDF margins (paddingHorizontal: 72pt, paddingTop/Bottom: 60pt)
        // 72pt ≈ 96px, 60pt ≈ 80px. Width 794px = 210mm at 96dpi.
        // Font size: PDF uses pt units; 16pt is the default base for this system.
        a4: "w-full min-h-[1122px] bg-white px-[96px] pt-[80px] pb-[80px] text-[16pt] leading-[1.5] text-[#1a1a1a] shadow-[0_2px_20px_rgba(0,0,0,0.12)] rounded-sm border border-[#e0e0e0] antialiased [text-rendering:optimizeLegibility]",
        none: "",
        select: "px-3 py-2 text-base data-readonly:w-fit bg-surface",
      },
    },
  },
);

export type EditorProps = PlateContentProps & VariantProps<typeof editorVariants>;

export const Editor = ({
  className,
  disabled,
  focused,
  variant,
  ref,
  ...props
}: EditorProps & { ref?: React.RefObject<HTMLDivElement | null> }) => (
  <PlateContent
    ref={ref}
    className={cn(
      editorVariants({
        disabled,
        focused,
        variant,
      }),
      className,
    )}
    disabled={disabled}
    disableDefaultStyles
    {...props}
  />
);

Editor.displayName = "Editor";

export function EditorView({
  className,
  variant,
  ...props
}: PlateViewProps & VariantProps<typeof editorVariants>) {
  return <PlateView {...props} className={cn(editorVariants({ variant }), className)} />;
}

EditorView.displayName = "EditorView";
