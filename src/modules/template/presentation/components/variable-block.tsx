"use client";

import { Image as ImageIcon } from "lucide-react";
import type { Descendant, TElement } from "platejs";
import { createPlatePlugin, type PlateElementProps } from "platejs/react";

import type { FieldTypeValue } from "@/modules/collection/domain/value-objects/field-type.vo";

export const VARIABLE_TYPE = "variable";

export interface VariableElementNode extends TElement {
  type: typeof VARIABLE_TYPE;
  children: Descendant[];
  fieldPath: string;
  collectionId: string;
  fieldType?: FieldTypeValue;
}

export const VariablePlugin = createPlatePlugin({
  key: VARIABLE_TYPE,
  options: {
    collectionId: "",
  },
}).extend({
  node: {
    isElement: true,
    isInline: true,
    isVoid: true,
  },
});

export function VariableElement(props: PlateElementProps<VariableElementNode>) {
  const { children, element, attributes } = props;
  const isImage = element.fieldType === "IMAGE";

  return (
    <span
      {...attributes}
      contentEditable={false}
      className={
        isImage
          ? "mx-0.5 inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/30 select-none"
          : "mx-0.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20 select-none"
      }
      data-variable-field-type={element.fieldType ?? "TEXT"}
    >
      {isImage && <ImageIcon size={12} />}
      <span className="opacity-70">{"{{"}</span>
      <span className="px-0.5 font-semibold leading-none">{element.fieldPath}</span>
      <span className="opacity-70">{"}}"}</span>
      {children}
    </span>
  );
}
