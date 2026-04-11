"use client";

import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import * as React from "react";

import { resolveDocumentFontFamily } from "@/shared/lib/document-typography";
import { cn } from "@/shared/lib/utils";

export function ParagraphElement(props: PlateElementProps) {
  const fontFamily =
    typeof props.element.fontFamily === "string"
      ? resolveDocumentFontFamily("web", props.element.fontFamily)
      : undefined;
  const mergedStyle = {
    ...(props.attributes.style as React.CSSProperties | undefined),
    ...(fontFamily ? { fontFamily } : {}),
  };

  return (
    <PlateElement {...props} className={cn("m-0 px-0 py-1")} style={mergedStyle}>
      {props.children}
    </PlateElement>
  );
}
