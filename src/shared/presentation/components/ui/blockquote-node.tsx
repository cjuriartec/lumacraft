"use client";

import { PlateElement, type PlateElementProps } from "platejs/react";

import { resolveDocumentFontFamily } from "@/shared/lib/document-typography";

export function BlockquoteElement(props: PlateElementProps) {
  const fontFamily =
    typeof props.element.fontFamily === "string"
      ? resolveDocumentFontFamily("web", props.element.fontFamily)
      : undefined;
  const mergedStyle = {
    ...(props.attributes.style as React.CSSProperties | undefined),
    ...(fontFamily ? { fontFamily } : {}),
  };

  return (
    <PlateElement
      as="blockquote"
      className="my-1 border-l-2 pl-6 italic"
      style={mergedStyle}
      {...props}
    />
  );
}
