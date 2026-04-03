"use client";

import type { Descendant, TElement } from "platejs";
import { createPlatePlugin, type PlateElementProps } from "platejs/react";

export const VARIABLE_TYPE = "variable";

export interface VariableElementNode extends TElement {
  type: typeof VARIABLE_TYPE;
  children: Descendant[];
  fieldPath: string;
  collectionId: string;
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

  return (
    <span
      {...attributes}
      contentEditable={false}
      className="mx-0.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20 select-none"
    >
      <span className="opacity-70">{"{{"}</span>
      <span className="px-0.5 font-semibold leading-none">{element.fieldPath}</span>
      <span className="opacity-70">{"}}"}</span>
      {children}
    </span>
  );
}
