import { SlateElement, type SlateElementProps } from "platejs/static";
import * as React from "react";

import { resolveDocumentFontFamily } from "@/shared/lib/document-typography";

export function BlockquoteElementStatic(props: SlateElementProps) {
  const fontFamily =
    typeof props.element.fontFamily === "string"
      ? resolveDocumentFontFamily("web", props.element.fontFamily)
      : undefined;
  const mergedStyle = {
    ...(props.attributes.style as React.CSSProperties | undefined),
    ...(fontFamily ? { fontFamily } : {}),
  };

  return (
    <SlateElement
      as="blockquote"
      className="my-1 border-l-2 pl-6 italic"
      style={mergedStyle}
      {...props}
    />
  );
}
