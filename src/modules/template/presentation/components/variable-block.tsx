"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Image as ImageIcon,
  Maximize2,
  RectangleHorizontal,
} from "lucide-react";
import type { Descendant, TElement } from "platejs";
import {
  createPlatePlugin,
  type PlateElementProps,
  useEditorRef,
  useReadOnly,
} from "platejs/react";
import * as React from "react";

import type { FieldTypeValue } from "@/modules/collection/domain/value-objects/field-type.vo";
import { cn } from "@/shared/lib/utils";

export const DEFAULT_IMAGE_VARIABLE_WIDTH_PERCENT = 100;
export const DEFAULT_IMAGE_VARIABLE_HEIGHT_PX = 180;
const IMAGE_PERCENT_PRESETS = [25, 50, 75, 100];
const IMAGE_PERCENT_MIN = 0;
const IMAGE_PERCENT_MAX = 100;
const IMAGE_HEIGHT_MIN = 48;
const IMAGE_HEIGHT_MAX = 1200;

export const VARIABLE_TYPE = "variable";

export interface VariableElementNode extends TElement {
  type: typeof VARIABLE_TYPE;
  children: Descendant[];
  fieldPath: string;
  collectionId: string;
  fieldType?: FieldTypeValue;
  imageWidthPercent?: number;
  imageHeightPx?: number;
  align?: "left" | "center" | "right" | "justify";
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

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function getImageWidthPercent(element: VariableElementNode): number {
  const raw = element.imageWidthPercent;
  if (typeof raw !== "number") {
    return DEFAULT_IMAGE_VARIABLE_WIDTH_PERCENT;
  }

  return clampNumber(raw, IMAGE_PERCENT_MIN, IMAGE_PERCENT_MAX);
}

function getImageHeightPx(element: VariableElementNode): number {
  const raw = element.imageHeightPx;
  if (typeof raw !== "number") {
    return DEFAULT_IMAGE_VARIABLE_HEIGHT_PX;
  }

  return clampNumber(raw, IMAGE_HEIGHT_MIN, IMAGE_HEIGHT_MAX);
}

export function VariableElement(props: PlateElementProps<VariableElementNode>) {
  const { children, element, attributes } = props;
  const isImage = element.fieldType === "IMAGE";
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const widthPercent = getImageWidthPercent(element);
  const heightPx = getImageHeightPx(element);
  const align = element.align ?? "left";

  const updateLayout = React.useCallback(
    (
      patch: Partial<Pick<VariableElementNode, "imageWidthPercent" | "imageHeightPx" | "align">>,
    ) => {
      const path = editor.api.findPath(element);
      if (!path) return;
      editor.tf.setNodes(patch, { at: path });
    },
    [editor, element],
  );

  if (!isImage) {
    return (
      <span
        {...attributes}
        contentEditable={false}
        className="mx-0.5 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-sm font-medium text-primary ring-1 ring-inset ring-primary/20 select-none"
        data-variable-field-type={element.fieldType ?? "TEXT"}
      >
        <span className="opacity-70">{"{{"}</span>
        <span className="px-0.5 font-semibold leading-none">{element.fieldPath}</span>
        <span className="opacity-70">{"}}"}</span>
        {children}
      </span>
    );
  }

  const showToolbar = !readOnly;
  const previewWidthPx = Math.max(100, Math.round((widthPercent / 100) * 698));

  return (
    <span
      {...attributes}
      contentEditable={false}
      className={cn(
        "my-2 inline-flex w-full max-w-full flex-col gap-2 align-middle",
        align === "center" && "items-center",
        align === "right" && "items-end",
        align === "justify" && "items-stretch",
      )}
      data-variable-field-type={element.fieldType ?? "TEXT"}
    >
      <span
        className={cn(
          "relative overflow-hidden rounded-md border border-primary/30 bg-primary/5 shadow-sm transition-all",
          showToolbar && "ring-2 ring-primary/35",
        )}
        style={{
          width: align === "justify" ? "100%" : `${previewWidthPx}px`,
          height: `${heightPx}px`,
          maxWidth: "100%",
        }}
      >
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(100,116,139,0.12)_25%,transparent_25%,transparent_50%,rgba(100,116,139,0.12)_50%,rgba(100,116,139,0.12)_75%,transparent_75%,transparent)] bg-size-[14px_14px]" />
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-3 text-center text-primary">
          <ImageIcon size={18} />
          <span className="max-w-full truncate text-xs font-semibold">{element.fieldPath}</span>
          <span className="text-[10px] opacity-80">
            {widthPercent}% · {heightPx}px
          </span>
        </span>
      </span>

      {showToolbar && (
        <span
          className="inline-flex w-full max-w-full flex-wrap items-center gap-x-2 gap-y-1.5 rounded-md border border-border/60 bg-surface/95 px-2 py-1 text-xs shadow-sm"
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
        >
          <div className="flex items-center gap-1.5 border-r border-border/40 pr-2">
            <button
              type="button"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded transition-colors",
                align === "left"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/30",
              )}
              onClick={() => updateLayout({ align: "left" })}
              title="Alinear Izquierda"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded transition-colors",
                align === "center"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/30",
              )}
              onClick={() => updateLayout({ align: "center" })}
              title="Centrar"
            >
              <AlignCenter size={14} />
            </button>
            <button
              type="button"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded transition-colors",
                align === "right"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/30",
              )}
              onClick={() => updateLayout({ align: "right" })}
              title="Alinear Derecha"
            >
              <AlignRight size={14} />
            </button>
            <button
              type="button"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded transition-colors",
                align === "justify"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted/30",
              )}
              onClick={() => updateLayout({ align: "justify" })}
              title="Justificar"
            >
              <AlignJustify size={14} />
            </button>
          </div>

          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <RectangleHorizontal size={12} />
            Ancho
          </span>
          {IMAGE_PERCENT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={cn(
                "h-6 rounded border px-1.5 font-medium transition-colors",
                widthPercent === preset
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border/60 bg-background text-foreground/80 hover:bg-muted/30",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => updateLayout({ imageWidthPercent: preset })}
            >
              {preset}%
            </button>
          ))}
          <input
            type="number"
            min={IMAGE_PERCENT_MIN}
            max={IMAGE_PERCENT_MAX}
            value={widthPercent}
            className="h-6 w-16 rounded border border-border/60 bg-background px-1.5 text-xs"
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              updateLayout({
                imageWidthPercent: clampNumber(nextValue, IMAGE_PERCENT_MIN, IMAGE_PERCENT_MAX),
              });
            }}
            aria-label="Ancho en porcentaje"
          />

          <span className="ml-1 inline-flex items-center gap-1 text-muted-foreground">
            <Maximize2 size={12} />
            Alto
          </span>
          <input
            type="number"
            min={IMAGE_HEIGHT_MIN}
            max={IMAGE_HEIGHT_MAX}
            value={heightPx}
            className="h-6 w-16 rounded border border-border/60 bg-background px-1.5 text-xs"
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              const nextValue = Number(event.target.value);
              updateLayout({
                imageHeightPx: clampNumber(nextValue, IMAGE_HEIGHT_MIN, IMAGE_HEIGHT_MAX),
              });
            }}
            aria-label="Alto en pixeles"
          />
          <span className="text-[10px] text-muted-foreground">px</span>
        </span>
      )}
      {children}
    </span>
  );
}
