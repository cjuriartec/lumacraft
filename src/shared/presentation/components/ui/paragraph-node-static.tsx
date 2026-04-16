import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import * as React from "react";

import {
  resolveDocumentFontFamily,
  resolveParagraphSpacingAfter,
  resolveParagraphSpacingBefore,
} from "@/shared/lib/document-typography";
import { cn } from "@/shared/lib/utils";

export function ParagraphElementStatic(props: SlateElementProps) {
  const fontFamily =
    typeof props.element.fontFamily === "string"
      ? resolveDocumentFontFamily("web", props.element.fontFamily)
      : undefined;
  const mergedStyle = {
    ...(props.attributes.style as React.CSSProperties | undefined),
    ...(fontFamily ? { fontFamily } : {}),
    marginBottom: `${resolveParagraphSpacingAfter(props.element.spaceAfter)}px`,
    marginTop: `${resolveParagraphSpacingBefore(props.element.spaceBefore)}px`,
  };

  return (
    <SlateElement {...props} className={cn("m-0 px-0 py-0")} style={mergedStyle}>
      {props.children}
    </SlateElement>
  );
}
