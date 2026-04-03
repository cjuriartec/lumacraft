"use client";

import { flip, offset, type UseVirtualFloatingOptions } from "@platejs/floating";
import { getLinkAttributes } from "@platejs/link";
import {
  FloatingLinkUrlInput,
  useFloatingLinkEdit,
  useFloatingLinkEditState,
  useFloatingLinkInsert,
  useFloatingLinkInsertState,
} from "@platejs/link/react";
import { cva } from "class-variance-authority";
import { ExternalLink, Link, Text, Unlink } from "lucide-react";
import { KEYS, type TElement } from "platejs";
import {
  useEditorRef,
  useEditorSelection,
  useFormInputProps,
  usePluginOption,
} from "platejs/react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";
import { Button, buttonVariants } from "@/shared/presentation/components/ui/button";
import { Separator } from "@/shared/presentation/components/ui/separator";

const popoverVariants = cva(
  "z-50 w-auto overflow-hidden rounded-xl border border-border/50 bg-surface p-1 shadow-xl backdrop-blur-sm outline-none",
);

const inputVariants = cva(
  "flex h-full w-full rounded-md border-0 bg-transparent px-2 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
);

export function LinkFloatingToolbar() {
  // Handle activeId for other plugins if they exist
  const activeCommentId = usePluginOption({ key: "comment" }, "activeId");
  const activeSuggestionId = usePluginOption({ key: "suggestion" }, "activeId");

  const floatingOptions: UseVirtualFloatingOptions = React.useMemo(
    () => ({
      middleware: [
        offset(12),
        flip({
          fallbackPlacements: ["bottom-end", "top-start", "top-end"],
          padding: 12,
        }),
      ],
      placement: activeSuggestionId || activeCommentId ? "top-start" : "bottom-start",
    }),
    [activeCommentId, activeSuggestionId],
  );

  const insertState = useFloatingLinkInsertState({
    floatingOptions,
  });
  const {
    hidden,
    props: insertProps,
    ref: insertRef,
    textInputProps,
  } = useFloatingLinkInsert(insertState);

  const editState = useFloatingLinkEditState({
    floatingOptions,
  });
  const {
    editButtonProps,
    props: editProps,
    ref: editRef,
    unlinkButtonProps,
  } = useFloatingLinkEdit(editState);

  const inputProps = useFormInputProps({
    preventDefaultOnEnterKeydown: true,
  });

  if (hidden) return null;

  const urlInput = (
    <div className="flex w-[330px] flex-col gap-0.5 p-1" {...inputProps}>
      <div className="flex gap-2 h-9 items-center overflow-hidden rounded-lg bg-surface-hover/30 px-2 transition-all focus-within:bg-surface-hover/50">
        <div className="flex items-center text-muted-foreground shrink-0 mr-1">
          <Link size={14} />
        </div>
        <FloatingLinkUrlInput
          className={inputVariants()}
          placeholder="Pegar enlace..."
          data-plate-focus
        />
      </div>

      <Separator className="my-1 border-border/20" />

      <div className="flex gap-2 h-9 items-center overflow-hidden rounded-lg bg-surface-hover/30 px-2 transition-all focus-within:bg-surface-hover/50">
        <div className="flex items-center text-muted-foreground shrink-0 mr-1">
          <Text size={14} />
        </div>
        <input
          className={inputVariants()}
          placeholder="Texto para mostrar"
          data-plate-focus
          {...textInputProps}
        />
      </div>
    </div>
  );

  const editContent = editState.isEditing ? (
    urlInput
  ) : (
    <div className="flex items-center gap-1 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 px-3 rounded-xl hover:bg-surface-hover/50 text-xs font-semibold"
        {...editButtonProps}
      >
        Editar enlace
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <LinkOpenButton />

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl hover:bg-red-500/10 hover:text-red-500"
        {...unlinkButtonProps}
      >
        <Unlink size={16} />
      </Button>
    </div>
  );

  return (
    <>
      <div ref={insertRef} className={popoverVariants()} {...insertProps}>
        {urlInput}
      </div>

      <div ref={editRef} className={popoverVariants()} {...editProps}>
        {editContent}
      </div>
    </>
  );
}

type TLinkElement = TElement & { url: string; target?: string };

function LinkOpenButton() {
  const editor = useEditorRef();
  const selection = useEditorSelection();

  const attributes = React.useMemo(
    () => {
      const entry = editor.api.node<TLinkElement>({
        match: { type: editor.getType(KEYS.link) },
      });
      if (!entry) {
        return {};
      }
      const [element] = entry;
      return getLinkAttributes(editor, element);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, selection],
  );

  return (
    <a
      {...(attributes as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      className={cn(
        buttonVariants({ size: "icon", variant: "ghost" }),
        "h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary",
      )}
      onMouseOver={(e) => {
        e.stopPropagation();
      }}
      aria-label="Open link in a new tab"
      target="_blank"
      rel="noopener noreferrer"
    >
      <ExternalLink size={16} />
    </a>
  );
}
