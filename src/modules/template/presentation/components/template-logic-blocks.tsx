"use client";

import { debounce } from "lodash";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  BrainCircuit,
  GitBranch,
  Italic,
  ListTree,
  Sliders,
  Split,
  Underline,
} from "lucide-react";
import { Descendant, TElement } from "platejs";
import {
  createPlatePlugin,
  type PlateEditor,
  PlateElement,
  type PlateElementProps,
  useEditorRef,
} from "platejs/react";
import type { ReactNode } from "react";
import * as React from "react";

import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import {
  DEFAULT_DOCUMENT_FONT_FAMILY,
  DOCUMENT_FONT_FAMILY_OPTIONS,
  resolveDocumentFontFamily,
  resolveDocumentFontSize,
  resolveDocumentLineHeight,
  type SupportedDocumentFontFamily,
} from "@/shared/lib/document-typography";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/presentation/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import { useTemplateVariableCatalog } from "../contexts/template-variable-catalog-context";
import { VariableNode } from "../hooks/use-variable-fields";
import { TemplateCollectionContext } from "../types/template-variable-catalog";
import { LogicBlockEditorDialog } from "./logic-block-editor-dialog";
import { VariableSelector } from "./variable-selector";

export const TEMPLATE_CONDITIONAL_TYPE = "template_conditional";
export const TEMPLATE_LIST_TYPE = "template_list";
export const TEMPLATE_SWITCH_TYPE = "template_switch";
export const TEMPLATE_AI_TYPE = "template_ai";
export const DEFAULT_TEMPLATE_AI_PROMPT =
  "Resume el registro actual. Destaca datos clave y no inventes informacion.";

type LogicNodeChildren = Descendant[];

/** Shared typography options for all logic block types */
export interface LogicBlockTypographyOptions {
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: string | number;
  indent?: number;
  fontSize?: string | number;
  fontFamily?: SupportedDocumentFontFamily;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface TemplateConditionalElementNode extends TElement, LogicBlockTypographyOptions {
  type: typeof TEMPLATE_CONDITIONAL_TYPE;
  children: LogicNodeChildren;
  fieldPath: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "is_empty"
    | "not_empty";
  value?: string | number | boolean | null;
  thenTemplate?: string;
  elseTemplate?: string;
  thenBlocks?: TemplateBlocks;
  elseBlocks?: TemplateBlocks;
}

export interface TemplateListElementNode extends TElement, LogicBlockTypographyOptions {
  type: typeof TEMPLATE_LIST_TYPE;
  children: LogicNodeChildren;
  sourcePath: string;
  itemAlias?: string;
  itemTemplate?: string;
  blocks?: TemplateBlocks;
  listStyle?: "none" | "bullet" | "number";
  emptyText?: string;
}

export interface TemplateSwitchCaseElement {
  equals: string | number | boolean | null;
  template: string;
  blocks?: TemplateBlocks;
}

export interface TemplateSwitchElementNode extends TElement, LogicBlockTypographyOptions {
  type: typeof TEMPLATE_SWITCH_TYPE;
  children: LogicNodeChildren;
  fieldPath: string;
  cases: TemplateSwitchCaseElement[];
  defaultTemplate?: string;
  defaultBlocks?: TemplateBlocks;
}

export interface TemplateAIElementNode extends TElement, LogicBlockTypographyOptions {
  type: typeof TEMPLATE_AI_TYPE;
  children: LogicNodeChildren;
  promptTemplate: string;
  collectionContext?: TemplateCollectionContext | null;
}

function baseChildren(): LogicNodeChildren {
  return [{ text: "" }];
}

export function createConditionalElement(): TemplateConditionalElementNode {
  return {
    type: TEMPLATE_CONDITIONAL_TYPE,
    children: baseChildren(),
    fontFamily: DEFAULT_DOCUMENT_FONT_FAMILY,
    fieldPath: "estado",
    operator: "equals",
    value: "aprobado",
    thenTemplate: "Contenido cuando la condición se cumple.\n",
    elseTemplate: "",
  };
}

export function createListElement(): TemplateListElementNode {
  return {
    type: TEMPLATE_LIST_TYPE,
    children: baseChildren(),
    fontFamily: DEFAULT_DOCUMENT_FONT_FAMILY,
    sourcePath: "items",
    itemAlias: "item",
    itemTemplate: "- {{item.nombre}}\n",
    listStyle: "none",
    emptyText: "",
  };
}

export function createSwitchElement(): TemplateSwitchElementNode {
  return {
    type: TEMPLATE_SWITCH_TYPE,
    children: baseChildren(),
    fontFamily: DEFAULT_DOCUMENT_FONT_FAMILY,
    fieldPath: "estado",
    cases: [
      { equals: "aprobado", template: "Estado aprobado\n" },
      { equals: "rechazado", template: "Estado rechazado\n" },
    ],
    defaultTemplate: "Estado sin clasificación\n",
  };
}

export function createAIElement(): TemplateAIElementNode {
  return {
    type: TEMPLATE_AI_TYPE,
    children: baseChildren(),
    fontFamily: DEFAULT_DOCUMENT_FONT_FAMILY,
    promptTemplate: DEFAULT_TEMPLATE_AI_PROMPT,
  };
}

export const TemplateConditionalPlugin = createPlatePlugin({
  key: TEMPLATE_CONDITIONAL_TYPE,
}).extend({
  node: {
    isElement: true,
    isVoid: true,
  },
});

export const TemplateListPlugin = createPlatePlugin({
  key: TEMPLATE_LIST_TYPE,
}).extend({
  node: {
    isElement: true,
    isVoid: true,
  },
});

export const TemplateSwitchPlugin = createPlatePlugin({
  key: TEMPLATE_SWITCH_TYPE,
}).extend({
  node: {
    isElement: true,
    isVoid: true,
  },
});

export const LOGIC_TYPES = new Set([
  TEMPLATE_AI_TYPE,
  TEMPLATE_CONDITIONAL_TYPE,
  TEMPLATE_LIST_TYPE,
  TEMPLATE_SWITCH_TYPE,
]);

export const DocumentNormalizationPlugin = createPlatePlugin({
  key: "document_normalization",
  handlers: {
    onChange: ({ editor }) => {
      const children = editor.children;
      if (!children || children.length === 0) return;

      const lastNode = children[children.length - 1] as TElement;
      if (lastNode && lastNode.type && LOGIC_TYPES.has(lastNode.type as string)) {
        // Appending a paragraph is safe as it doesn't trigger a recursive loop
        // because the 'lastNode' condition will fail in the next execution.
        editor.tf.insertNodes({ type: "p", children: [{ text: "" }] }, { at: [children.length] });
      }
    },
  },
});

export const TemplateAIPlugin = createPlatePlugin({
  key: TEMPLATE_AI_TYPE,
}).extend({
  node: {
    isElement: true,
    isVoid: true,
  },
});

function BlockShell({
  children,
  icon,
  title,
  style,
  contentStyle,
  actions,
  variant = "default",
  density = "regular",
  containerRef,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  actions?: ReactNode;
  variant?: "default" | "ai";
  density?: "regular" | "compact" | "micro" | "nano";
  containerRef?: React.Ref<HTMLDivElement>;
  onClick?: () => void;
}) {
  return (
    <div
      ref={containerRef}
      contentEditable={false}
      className={cn(
        "group my-4 w-full min-w-0 max-w-full overflow-hidden rounded-xl border transition-all duration-200",
        density === "nano"
          ? "p-1.5"
          : density === "micro"
            ? "p-2"
            : density === "compact"
              ? "p-2.5"
              : "p-3",
        onClick && "cursor-pointer hover:border-primary/40",
        // Force light styles since background is always white
        variant === "ai"
          ? "bg-[#f5f3ff]/50 border-indigo-200/60 shadow-[0_2px_12px_-3px_rgba(99,102,241,0.1)]"
          : "bg-slate-50/50 border-slate-200/80 shadow-sm",
      )}
      onClick={onClick}
      style={style}
    >
      <div
        className={cn(
          "flex min-w-0 justify-center gap-2 px-0.5 select-none align-middle",
          density === "nano"
            ? "mb-0 flex-wrap justify-between"
            : density === "micro"
              ? "mb-1.5 flex-nowrap justify-between"
              : "mb-3 flex-wrap",
        )}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 font-bold uppercase",
            density === "nano" || density === "micro"
              ? "flex-none tracking-[0.12em]"
              : "flex-1 text-[10px] tracking-[0.18em]",
            variant === "ai" ? "text-indigo-500/80" : "text-slate-500/60",
          )}
          title={title}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-lg shadow-sm ring-1",
              density === "nano" || density === "micro" ? "h-5 w-5" : "h-6 w-6",
              variant === "ai"
                ? "bg-white text-indigo-500 ring-indigo-100"
                : "bg-white text-slate-400 ring-slate-100",
            )}
          >
            {icon}
          </div>
          <span
            className={cn(
              "min-w-0 whitespace-normal wrap-break-word pt-0.5 leading-tight",
              (density === "nano" || density === "micro") && "sr-only",
            )}
          >
            {title}
          </span>
        </div>
        <div
          className={cn(
            "flex min-w-0 max-w-full items-center justify-end gap-1.5",
            density === "nano" || density === "micro" ? "flex-none" : "flex-wrap",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      </div>
      {density !== "nano" && (
        <div
          className="min-w-0 max-w-full wrap-break-word px-0.5 text-[#1a1a1a]"
          style={contentStyle}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface LogicBlockStylesPopoverProps {
  align: "left" | "center" | "right" | "justify";
  lineHeight: string | number;
  fontSize: string | number;
  fontFamily: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  onSave: (updates: Partial<LogicBlockTypographyOptions>) => void;
  density?: "regular" | "compact" | "micro" | "nano";
}

function LogicBlockStylesPopover({
  align,
  lineHeight,
  fontSize,
  fontFamily,
  bold,
  italic,
  underline,
  onSave,
  density = "regular",
}: LogicBlockStylesPopoverProps) {
  const [sizeInput, setSizeInput] = React.useState(String(fontSize));

  // Sync local input whenever the prop changes
  React.useEffect(() => {
    setSizeInput(String(fontSize));
  }, [fontSize]);

  const commitFontSize = () => {
    const parsed = parseInt(sizeInput, 10);
    if (!isNaN(parsed) && parsed >= 8 && parsed <= 96) {
      onSave({ fontSize: parsed });
    } else {
      setSizeInput(String(fontSize));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Estilos"
          aria-label="Estilos del bloque"
          className={cn(
            "rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-500/80 hover:bg-slate-200/50 hover:text-slate-900 transition-colors",
            density === "micro"
              ? "h-7 w-7 p-0"
              : density === "compact"
                ? "h-7 gap-1 px-2 py-1.5"
                : "h-auto max-w-full gap-1.5 px-2 py-1.5 whitespace-normal wrap-break-word",
          )}
        >
          <Sliders size={12} />
          {density !== "micro" && density !== "nano" ? "Estilos" : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-60 border-border/60 bg-surface-hover p-3 shadow-md space-y-4"
        side="top"
        align="end"
      >
        {/* Alignment */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Alineación
          </span>
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                { value: "left", icon: <AlignLeft size={16} /> },
                { value: "center", icon: <AlignCenter size={16} /> },
                { value: "right", icon: <AlignRight size={16} /> },
                { value: "justify", icon: <AlignJustify size={16} /> },
              ] as const
            ).map((opt) => (
              <Button
                key={opt.value}
                size="icon"
                variant={align === opt.value ? "secondary" : "ghost"}
                className={cn(
                  "h-9 w-full rounded-md",
                  align === opt.value &&
                    "bg-primary/10 text-primary border border-primary/20 shadow-sm",
                )}
                onClick={() => onSave({ align: opt.value })}
              >
                {opt.icon}
              </Button>
            ))}
          </div>
        </div>

        {/* Formato (Bold, Italic, Underline) */}
        <div className="space-y-2 border-t border-border/40 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Formato
          </span>
          <div className="grid grid-cols-3 gap-1">
            <Button
              size="icon"
              variant={bold ? "secondary" : "ghost"}
              className={cn(
                "h-9 w-full rounded-md",
                bold && "bg-primary/10 text-primary border border-primary/20 shadow-sm",
              )}
              onClick={() => onSave({ bold: !bold })}
            >
              <Bold size={16} />
            </Button>
            <Button
              size="icon"
              variant={italic ? "secondary" : "ghost"}
              className={cn(
                "h-9 w-full rounded-md",
                italic && "bg-primary/10 text-primary border border-primary/20 shadow-sm",
              )}
              onClick={() => onSave({ italic: !italic })}
            >
              <Italic size={16} />
            </Button>
            <Button
              size="icon"
              variant={underline ? "secondary" : "ghost"}
              className={cn(
                "h-9 w-full rounded-md",
                underline && "bg-primary/10 text-primary border border-primary/20 shadow-sm",
              )}
              onClick={() => onSave({ underline: !underline })}
            >
              <Underline size={16} />
            </Button>
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-2 border-t border-border/40 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Tamaño de texto
          </span>
          <input
            type="number"
            min={8}
            max={96}
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onBlur={commitFontSize}
            onKeyDown={(e) => e.key === "Enter" && commitFontSize()}
            className="h-8 w-full rounded-md border border-border/40 bg-muted/10 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Font Family */}
        <div className="space-y-2 border-t border-border/40 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Tipografía
          </span>
          <Select
            value={fontFamily ?? ""}
            onValueChange={(v) =>
              onSave({ fontFamily: (v || undefined) as SupportedDocumentFontFamily })
            }
          >
            <SelectTrigger className="h-8 rounded-md border-border/40 bg-muted/10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_FONT_FAMILY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Line Height */}
        <div className="space-y-2 border-t border-border/40 pt-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
            Interlineado
          </span>
          <div className="grid grid-cols-4 gap-1">
            {[1, 1.2, 1.5, 2].map((val) => (
              <Button
                key={val}
                size="sm"
                variant={Number(lineHeight) === val ? "secondary" : "ghost"}
                className={cn(
                  "h-8 text-[11px] font-bold",
                  Number(lineHeight) === val &&
                    "bg-primary/10 text-primary border border-primary/20 shadow-sm",
                )}
                onClick={() => onSave({ lineHeight: val })}
              >
                {val}x
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function autoResizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = "0px";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 96)}px`;
}

function useLogicBlockDensity() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [density, setDensity] = React.useState<"regular" | "compact" | "micro" | "nano">("regular");

  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateDensity = () => {
      const width = element.getBoundingClientRect().width;
      if (width <= 140) {
        setDensity("nano");
        return;
      }
      if (width <= 220) {
        setDensity("micro");
        return;
      }
      if (width <= 340) {
        setDensity("compact");
        return;
      }
      setDensity("regular");
    };

    updateDensity();

    const observer = new ResizeObserver(updateDensity);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, density };
}

export function TemplateAIInlinePromptEditor({
  value,
  onChange,
  nodes = [],
  loading = false,
  textStyle,
}: {
  value: string;
  onChange: (nextPrompt: string) => void;
  nodes?: VariableNode[];
  loading?: boolean;
  textStyle?: React.CSSProperties;
}) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [localValue, setLocalValue] = React.useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const debouncedOnChange = React.useMemo(
    () => debounce((nextValue: string) => onChange(nextValue), 300),
    [onChange],
  );

  React.useLayoutEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [localValue]);

  const handleChange = (nextValue: string) => {
    setLocalValue(nextValue);
    debouncedOnChange(nextValue);
    autoResizeTextarea(textareaRef.current);
  };

  const handleVariableSelect = (node: { path: string }) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const token = `{{${node.path}}}`;

    const newValue = localValue.substring(0, start) + token + localValue.substring(end);

    setLocalValue(newValue);
    debouncedOnChange(newValue);

    // Reposition cursor after the token
    window.requestAnimationFrame(() => {
      textarea.focus();
      const nextPos = start + token.length;
      textarea.setSelectionRange(nextPos, nextPos);
      autoResizeTextarea(textarea);
    });
  };

  return (
    <div className="relative group">
      <Textarea
        ref={textareaRef}
        value={localValue}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Escribe tu prompt aquí..."
        className="min-h-[96px] w-full resize-none border-none bg-transparent p-2 text-slate-700 placeholder:text-slate-400 focus-visible:ring-0"
        style={textStyle}
      />
      <div className="absolute bottom-1 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <VariableSelector
          nodes={nodes}
          loading={loading}
          onSelect={handleVariableSelect}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 rounded-md p-0 text-muted-foreground/40 hover:bg-muted/10 hover:text-primary"
              title="Insertar variable"
            >
              <Braces size={14} />
            </Button>
          }
        />
      </div>
    </div>
  );
}

export function TemplateConditionalElement(
  props: PlateElementProps<TemplateConditionalElementNode>,
) {
  const { attributes, children, element } = props;
  const {
    nodes: variableCatalog,
    loading: variableCatalogLoading,
    error: variableCatalogError,
  } = useTemplateVariableCatalog();
  const editor = useEditorRef();
  const { ref: shellRef, density } = useLogicBlockDensity();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const align = element.align ?? "left";
  const lineHeight = resolveDocumentLineHeight(element.lineHeight);
  const fontSize = resolveDocumentFontSize(element.fontSize, TEMPLATE_CONDITIONAL_TYPE);
  const fontFamily = element.fontFamily ?? "arial";

  const indent = element.indent ?? 0;

  const onSave = (updatedElement: Partial<TemplateConditionalElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;
    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell
        icon={<GitBranch size={14} />}
        title="Bloque Condicional"
        actions={
          <LogicBlockStylesPopover
            align={align}
            lineHeight={lineHeight}
            fontSize={fontSize}
            fontFamily={fontFamily}
            bold={element.bold}
            italic={element.italic}
            underline={element.underline}
            density={density}
            onSave={(updates) => onSave(updates as Partial<TemplateConditionalElementNode>)}
          />
        }
        containerRef={shellRef}
        density={density}
        onClick={density === "nano" ? () => setIsDialogOpen(true) : undefined}
        style={{
          marginLeft: indent ? `${indent * 24}px` : undefined,
        }}
        contentStyle={{
          textAlign: align,
          lineHeight,
          fontSize: `${fontSize}pt`,
          fontFamily: resolveDocumentFontFamily("web", fontFamily),
          fontWeight: element.bold ? "bold" : "normal",
          fontStyle: element.italic ? "italic" : "normal",
          textDecoration: element.underline ? "underline" : "none",
        }}
      >
        <p
          className={cn(
            "font-medium text-slate-500/80 whitespace-normal wrap-break-word",
            density === "micro" ? "text-[10px] leading-tight" : "text-[12px]",
          )}
        >
          si <b className="text-slate-700 break-all">{element.fieldPath}</b>{" "}
          <b className="text-slate-700 wrap-break-word">{element.operator}</b>{" "}
          <b className="text-slate-700 break-all">{String(element.value ?? "")}</b>
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Configurar condición"
          aria-label="Configurar condición"
          className={cn(
            "mt-2.5 font-bold uppercase tracking-wider text-primary/70 hover:bg-primary/5 hover:text-primary transition-colors",
            density === "micro"
              ? "h-7 w-7 p-0"
              : density === "compact"
                ? "h-7 w-full max-w-full px-2 py-1 text-[10px]"
                : "h-auto w-full max-w-full px-2 py-1.5 text-[11px] whitespace-normal wrap-break-word",
          )}
          onClick={() => setIsDialogOpen(true)}
        >
          {density === "micro" ? <GitBranch size={13} /> : "Configurar Condición"}
        </Button>
      </BlockShell>
      <LogicBlockEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        element={element}
        onSave={onSave}
        catalogNodes={variableCatalog}
        catalogLoading={variableCatalogLoading}
        catalogError={variableCatalogError}
      />
      {children}
    </PlateElement>
  );
}

export function TemplateListElement(props: PlateElementProps<TemplateListElementNode>) {
  const { attributes, children, element } = props;
  const {
    nodes: variableCatalog,
    loading: variableCatalogLoading,
    error: variableCatalogError,
  } = useTemplateVariableCatalog();
  const editor = useEditorRef();
  const { ref: shellRef, density } = useLogicBlockDensity();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const align = element.align ?? "left";
  const lineHeight = resolveDocumentLineHeight(element.lineHeight);
  const fontSize = resolveDocumentFontSize(element.fontSize, TEMPLATE_LIST_TYPE);
  const fontFamily = element.fontFamily ?? "arial";

  const indent = element.indent ?? 0;

  const onSave = (updatedElement: Partial<TemplateListElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;
    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell
        icon={<ListTree size={14} />}
        title="Bloque de Bucle (Lista)"
        actions={
          <LogicBlockStylesPopover
            align={align}
            lineHeight={lineHeight}
            fontSize={fontSize}
            fontFamily={fontFamily}
            bold={element.bold}
            italic={element.italic}
            underline={element.underline}
            density={density}
            onSave={(updates) => onSave(updates as Partial<TemplateListElementNode>)}
          />
        }
        containerRef={shellRef}
        density={density}
        onClick={density === "nano" ? () => setIsDialogOpen(true) : undefined}
        style={{
          marginLeft: indent ? `${indent * 24}px` : undefined,
        }}
        contentStyle={{
          textAlign: align,
          lineHeight,
          fontSize: `${fontSize}pt`,
          fontFamily: resolveDocumentFontFamily("web", fontFamily),
          fontWeight: element.bold ? "bold" : "normal",
          fontStyle: element.italic ? "italic" : "normal",
          textDecoration: element.underline ? "underline" : "none",
        }}
      >
        <p
          className={cn(
            "font-medium text-slate-500/80 whitespace-normal wrap-break-word",
            density === "micro" ? "text-[10px] leading-tight" : "text-[12px]",
          )}
        >
          origen: <b className="text-slate-700 break-all">{element.sourcePath}</b> como{" "}
          <b className="text-slate-700 break-all">{element.itemAlias ?? "item"}</b>
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Configurar bucle"
          aria-label="Configurar bucle"
          className={cn(
            "mt-2.5 font-bold uppercase tracking-wider text-primary/70 hover:bg-primary/5 hover:text-primary transition-colors",
            density === "micro"
              ? "h-7 w-7 p-0"
              : density === "compact"
                ? "h-7 w-full max-w-full px-2 py-1 text-[10px]"
                : "h-auto w-full max-w-full px-2 py-1.5 text-[11px] whitespace-normal wrap-break-word",
          )}
          onClick={() => setIsDialogOpen(true)}
        >
          {density === "micro" ? <ListTree size={13} /> : "Configurar Bucle"}
        </Button>
      </BlockShell>
      <LogicBlockEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        element={element}
        onSave={onSave}
        catalogNodes={variableCatalog}
        catalogLoading={variableCatalogLoading}
        catalogError={variableCatalogError}
      />
      {children}
    </PlateElement>
  );
}

export function TemplateSwitchElement(props: PlateElementProps<TemplateSwitchElementNode>) {
  const { attributes, children, element } = props;
  const {
    nodes: variableCatalog,
    loading: variableCatalogLoading,
    error: variableCatalogError,
  } = useTemplateVariableCatalog();
  const editor = useEditorRef();
  const { ref: shellRef, density } = useLogicBlockDensity();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const align = element.align ?? "left";
  const lineHeight = resolveDocumentLineHeight(element.lineHeight);
  const fontSize = resolveDocumentFontSize(element.fontSize, TEMPLATE_SWITCH_TYPE);
  const fontFamily = element.fontFamily ?? "arial";

  const indent = element.indent ?? 0;

  const onSave = (updatedElement: Partial<TemplateSwitchElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;
    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell
        icon={<Split size={14} />}
        title="Bloque de Selección (Switch)"
        actions={
          <LogicBlockStylesPopover
            align={align}
            lineHeight={lineHeight}
            fontSize={fontSize}
            fontFamily={fontFamily}
            bold={element.bold}
            italic={element.italic}
            underline={element.underline}
            density={density}
            onSave={(updates) => onSave(updates as Partial<TemplateSwitchElementNode>)}
          />
        }
        containerRef={shellRef}
        density={density}
        onClick={density === "nano" ? () => setIsDialogOpen(true) : undefined}
        style={{
          marginLeft: indent ? `${indent * 24}px` : undefined,
        }}
        contentStyle={{
          textAlign: align,
          lineHeight,
          fontSize: `${fontSize}pt`,
          fontFamily: resolveDocumentFontFamily("web", fontFamily),
          fontWeight: element.bold ? "bold" : "normal",
          fontStyle: element.italic ? "italic" : "normal",
          textDecoration: element.underline ? "underline" : "none",
        }}
      >
        <p
          className={cn(
            "font-medium text-slate-500/80 whitespace-normal wrap-break-word",
            density === "micro" ? "text-[10px] leading-tight" : "text-[12px]",
          )}
        >
          switch <b className="text-slate-700 break-all">{element.fieldPath}</b> (
          {element.cases?.length ?? 0} casos)
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          title="Configurar casos"
          aria-label="Configurar casos"
          className={cn(
            "mt-2.5 font-bold uppercase tracking-wider text-primary/70 hover:bg-primary/5 hover:text-primary transition-colors",
            density === "micro"
              ? "h-7 w-7 p-0"
              : density === "compact"
                ? "h-7 w-full max-w-full px-2 py-1 text-[10px]"
                : "h-auto w-full max-w-full px-2 py-1.5 text-[11px] whitespace-normal wrap-break-word",
          )}
          onClick={() => setIsDialogOpen(true)}
        >
          {density === "micro" ? <Split size={13} /> : "Configurar Casos"}
        </Button>
      </BlockShell>
      <LogicBlockEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        element={element}
        onSave={onSave}
        catalogNodes={variableCatalog}
        catalogLoading={variableCatalogLoading}
        catalogError={variableCatalogError}
      />
      {children}
    </PlateElement>
  );
}

export function TemplateAIElement(props: PlateElementProps<TemplateAIElementNode>) {
  const { attributes, children, element } = props;
  const {
    nodes: variableCatalog,
    loading: variableCatalogLoading,
    error: variableCatalogError,
  } = useTemplateVariableCatalog();
  const editor = useEditorRef();
  const { ref: shellRef, density } = useLogicBlockDensity();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const align = element.align ?? "left";
  const lineHeight = resolveDocumentLineHeight(element.lineHeight);
  const indent = element.indent ?? 0;
  const fontSize = resolveDocumentFontSize(element.fontSize, TEMPLATE_AI_TYPE);
  const fontFamily = element.fontFamily ?? "arial";
  const resolvedFontFamily = resolveDocumentFontFamily("web", fontFamily);

  const promptValue = element.promptTemplate?.trim().length
    ? element.promptTemplate
    : DEFAULT_TEMPLATE_AI_PROMPT;

  const onSave = (updatedElement: Partial<TemplateAIElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;
    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell
        variant="ai"
        icon={<BrainCircuit size={14} />}
        title="IA Dinámica"
        actions={
          <LogicBlockStylesPopover
            align={align}
            lineHeight={lineHeight}
            fontSize={fontSize}
            fontFamily={fontFamily}
            bold={element.bold}
            italic={element.italic}
            underline={element.underline}
            density={density}
            onSave={(updates) => onSave(updates as Partial<TemplateAIElementNode>)}
          />
        }
        containerRef={shellRef}
        density={density}
        onClick={density === "nano" ? () => setIsDialogOpen(true) : undefined}
        style={{
          marginLeft: indent ? `${indent * 24}px` : undefined,
        }}
        contentStyle={{
          textAlign: align,
          lineHeight,
          fontSize: `${fontSize}pt`,
          fontFamily: resolveDocumentFontFamily("web", fontFamily),
          fontWeight: element.bold ? "bold" : "normal",
          fontStyle: element.italic ? "italic" : "normal",
          textDecoration: element.underline ? "underline" : "none",
        }}
      >
        <TemplateAIInlinePromptEditor
          value={promptValue}
          nodes={variableCatalog}
          loading={variableCatalogLoading}
          onChange={(nextPrompt) => onSave({ promptTemplate: nextPrompt })}
          textStyle={{
            textAlign: align,
            lineHeight,
            fontSize: `${fontSize}pt`,
            fontFamily: resolvedFontFamily,
          }}
        />
      </BlockShell>
      <LogicBlockEditorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        element={element}
        onSave={onSave}
        catalogNodes={variableCatalog}
        catalogLoading={variableCatalogLoading}
        catalogError={variableCatalogError}
      />
      {children}
    </PlateElement>
  );
}

export const TemplateLogicBlocksPluginKit = [
  TemplateConditionalPlugin,
  TemplateListPlugin,
  TemplateSwitchPlugin,
  TemplateAIPlugin,
  DocumentNormalizationPlugin,
];

export interface TemplateLogicSlashItem {
  icon: ReactNode;
  label: string;
  value: string;
  keywords?: string[];
  focusEditor?: boolean;
  onSelect: (editor: PlateEditor) => void;
}

export interface TemplateLogicSlashGroup {
  group: string;
  items: TemplateLogicSlashItem[];
}

export function getTemplateLogicSlashGroups(): TemplateLogicSlashGroup[] {
  return [
    {
      group: "Lógica",
      items: [
        {
          icon: <GitBranch size={16} />,
          label: "Conditional Block",
          value: TEMPLATE_CONDITIONAL_TYPE,
          keywords: ["if", "conditional", "condition"],
          onSelect: (editor: PlateEditor) => {
            editor.tf.insertNodes([createConditionalElement()]);
          },
        },
        {
          icon: <ListTree size={16} />,
          label: "List Block",
          value: TEMPLATE_LIST_TYPE,
          keywords: ["list", "for", "each"],
          onSelect: (editor: PlateEditor) => {
            editor.tf.insertNodes([createListElement()]);
          },
        },
        {
          icon: <Split size={16} />,
          label: "Switch Block",
          value: TEMPLATE_SWITCH_TYPE,
          keywords: ["switch", "case"],
          onSelect: (editor: PlateEditor) => {
            editor.tf.insertNodes([createSwitchElement()]);
          },
        },
      ],
    },
    {
      group: "IA",
      items: [
        {
          icon: <BrainCircuit size={16} />,
          label: "AI Block",
          value: TEMPLATE_AI_TYPE,
          keywords: ["ai", "gemini", "prompt"],
          onSelect: (editor: PlateEditor) => {
            editor.tf.insertNodes([createAIElement()]);
          },
        },
        {
          icon: <Braces size={16} />,
          label: "Variable",
          value: "variable",
          keywords: ["variable", "campo", "dinamico"],
          onSelect: () => {
            window.requestAnimationFrame(() => {
              window.dispatchEvent(new CustomEvent("open-variable-selector"));
            });
          },
          focusEditor: false,
        },
      ],
    },
  ];
}
