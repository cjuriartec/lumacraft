"use client";

import { debounce } from "lodash";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Braces,
  BrainCircuit,
  GitBranch,
  ListTree,
  Split,
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
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/presentation/components/ui/popover";
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import { useTemplateVariableCatalog } from "../contexts/template-variable-catalog-context";
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

export interface TemplateConditionalElementNode extends TElement {
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

export interface TemplateListElementNode extends TElement {
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

export interface TemplateSwitchElementNode extends TElement {
  type: typeof TEMPLATE_SWITCH_TYPE;
  children: LogicNodeChildren;
  fieldPath: string;
  cases: TemplateSwitchCaseElement[];
  defaultTemplate?: string;
  defaultBlocks?: TemplateBlocks;
}

export interface TemplateAIElementNode extends TElement {
  type: typeof TEMPLATE_AI_TYPE;
  children: LogicNodeChildren;
  promptTemplate: string;
  collectionContext?: TemplateCollectionContext | null;
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  indent?: number;
}

function baseChildren(): LogicNodeChildren {
  return [{ text: "" }];
}

export function createConditionalElement(): TemplateConditionalElementNode {
  return {
    type: TEMPLATE_CONDITIONAL_TYPE,
    children: baseChildren(),
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
  actions,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  style?: React.CSSProperties;
  actions?: ReactNode;
}) {
  return (
    <div
      contentEditable={false}
      className="my-2 rounded-lg border border-border/40 bg-card p-2.5 transition-all hover:border-border/60"
      style={style}
    >
      <div className="mb-2 flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted/10 text-foreground/40">
            {icon}
          </div>
          {title}
        </div>
        <div className="flex items-center gap-1.5">{actions}</div>
      </div>
      <div className="px-0.5">{children}</div>
    </div>
  );
}

function autoResizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = "0px";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 96)}px`;
}

export function TemplateAIInlinePromptEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (nextPrompt: string) => void;
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

  return (
    <Textarea
      ref={textareaRef}
      value={localValue}
      onChange={(event) => handleChange(event.target.value)}
      placeholder="Escribe tu prompt aquí..."
      className="min-h-[64px] resize-none border-none bg-transparent p-2 text-sm leading-6 focus-visible:ring-0"
    />
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

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleEdit = () => {
    setIsDialogOpen(true);
  };

  const onSave = (updatedElement: Partial<TemplateConditionalElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;

    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell icon={<GitBranch size={14} />} title="Conditional Block">
        <p className="text-xs text-foreground/80">
          if <b>{element.fieldPath}</b> <b>{element.operator}</b>{" "}
          <b>{String(element.value ?? "")}</b>
        </p>
        <Button type="button" size="sm" variant="outline" className="mt-2 h-7" onClick={handleEdit}>
          Editar
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

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleEdit = () => {
    setIsDialogOpen(true);
  };

  const onSave = (updatedElement: Partial<TemplateListElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;

    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell icon={<ListTree size={14} />} title="List Block">
        <p className="text-xs text-foreground/80">
          source: <b>{element.sourcePath}</b> as <b>{element.itemAlias ?? "item"}</b>
        </p>
        <Button type="button" size="sm" variant="outline" className="mt-2 h-7" onClick={handleEdit}>
          Editar
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

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleEdit = () => {
    setIsDialogOpen(true);
  };

  const onSave = (updatedElement: Partial<TemplateSwitchElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;

    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell icon={<Split size={14} />} title="Switch Block">
        <p className="text-xs text-foreground/80">
          switch <b>{element.fieldPath}</b> ({element.cases?.length ?? 0} casos)
        </p>
        <Button type="button" size="sm" variant="outline" className="mt-2 h-7" onClick={handleEdit}>
          Editar
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
  const { nodes: variableCatalog, loading: variableCatalogLoading } = useTemplateVariableCatalog();
  const editor = useEditorRef();

  const align = element.align ?? "left";
  const lineHeight = element.lineHeight ?? 1.5;
  const indent = element.indent ?? 0;

  const promptValue = element.promptTemplate?.trim().length
    ? element.promptTemplate
    : DEFAULT_TEMPLATE_AI_PROMPT;

  const onSave = (updatedElement: Partial<TemplateAIElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;

    editor.tf.setNodes(updatedElement, { at: path });
  };

  const aiActions = (
    <div className="flex items-center gap-0.5">
      <VariableSelector
        nodes={variableCatalog}
        loading={variableCatalogLoading}
        onSelect={(node) => {
          const nextPrompt = `${promptValue} {{${node.path}}}`;
          onSave({ promptTemplate: nextPrompt });
        }}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-md px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:bg-muted/10 hover:text-foreground"
          >
            <Braces size={12} />
            Variables
          </Button>
        }
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 rounded-md px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:bg-muted/10 hover:text-foreground"
          >
            <AlignCenter size={12} />
            Estilos
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 border-border/60 bg-surface-hover p-3 shadow-md"
          side="top"
          align="end"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Alineación
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { value: "left", icon: <AlignLeft size={16} /> },
                  { value: "center", icon: <AlignCenter size={16} /> },
                  { value: "right", icon: <AlignRight size={16} /> },
                  { value: "justify", icon: <AlignJustify size={16} /> },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    size="icon"
                    variant={align === opt.value ? "secondary" : "ghost"}
                    className={cn(
                      "h-9 w-full rounded-md",
                      align === opt.value &&
                        "bg-primary/10 text-primary border border-primary/20 shadow-sm",
                    )}
                    onClick={() =>
                      onSave({
                        align: opt.value as "left" | "center" | "right" | "justify",
                      })
                    }
                  >
                    {opt.icon}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border/40 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                Interlineado
              </span>
              <div className="grid grid-cols-4 gap-1">
                {[1, 1.2, 1.5, 2].map((val) => (
                  <Button
                    key={val}
                    size="sm"
                    variant={lineHeight === val ? "secondary" : "ghost"}
                    className={cn(
                      "h-8 text-[11px] font-bold",
                      lineHeight === val &&
                        "bg-primary/10 text-primary border border-primary/20 shadow-sm",
                    )}
                    onClick={() => onSave({ lineHeight: val })}
                  >
                    {val}x
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell
        icon={<BrainCircuit size={14} />}
        title="AI Block"
        actions={aiActions}
        style={{
          textAlign: align,
          lineHeight,
          marginLeft: indent ? `${indent * 24}px` : undefined,
        }}
      >
        <TemplateAIInlinePromptEditor
          value={promptValue}
          onChange={(nextPrompt) => onSave({ promptTemplate: nextPrompt })}
        />
      </BlockShell>
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
