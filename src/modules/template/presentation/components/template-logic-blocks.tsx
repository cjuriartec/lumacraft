"use client";

import { Braces, BrainCircuit, Database, GitBranch, ListTree, Split } from "lucide-react";
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

import { Button } from "@/shared/presentation/components/ui/button";
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import { useTemplateVariableCatalog } from "../contexts/template-variable-catalog-context";
import {
  TemplateCollectionContext,
  TemplateVariableCatalogNode,
} from "../types/template-variable-catalog";
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
}

export interface TemplateListElementNode extends TElement {
  type: typeof TEMPLATE_LIST_TYPE;
  children: LogicNodeChildren;
  sourcePath: string;
  itemAlias?: string;
  itemTemplate?: string;
  emptyText?: string;
}

export interface TemplateSwitchCaseElement {
  equals: string | number | boolean | null;
  template: string;
}

export interface TemplateSwitchElementNode extends TElement {
  type: typeof TEMPLATE_SWITCH_TYPE;
  children: LogicNodeChildren;
  fieldPath: string;
  cases: TemplateSwitchCaseElement[];
  defaultTemplate?: string;
}

export interface TemplateAIElementNode extends TElement {
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
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      contentEditable={false}
      className="my-3 rounded-xl border border-border/60 bg-surface/70 p-3 shadow-sm"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function insertPromptToken(
  textarea: HTMLTextAreaElement | null,
  currentValue: string,
  token: string,
  onChange: (nextValue: string) => void,
) {
  if (!textarea) {
    onChange(`${currentValue}${token}`);
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const nextValue = `${currentValue.slice(0, start)}${token}${currentValue.slice(end)}`;
  onChange(nextValue);

  window.requestAnimationFrame(() => {
    textarea.focus();
    const nextCursor = start + token.length;
    textarea.setSelectionRange(nextCursor, nextCursor);
  });
}

function autoResizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = "0px";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 96)}px`;
}

interface TemplateAIInlinePromptEditorProps {
  value: string;
  catalogNodes: TemplateVariableCatalogNode[];
  catalogLoading?: boolean;
  catalogError?: string | null;
  collectionContext?: TemplateCollectionContext | null;
  onChange: (nextPrompt: string) => void;
}

export function TemplateAIInlinePromptEditor({
  value,
  catalogNodes,
  catalogLoading = false,
  catalogError = null,
  collectionContext = null,
  onChange,
}: TemplateAIInlinePromptEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  React.useLayoutEffect(() => {
    autoResizeTextarea(textareaRef.current);
  }, [value]);

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
    autoResizeTextarea(textareaRef.current);
  };

  return (
    <div className="space-y-3">
      {collectionContext && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/5 px-3 py-2">
          <Database size={12} className="shrink-0 text-primary/60" />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-semibold text-primary/80">
              {collectionContext.name}
            </span>
            {collectionContext.description && (
              <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                — {collectionContext.description}
              </span>
            )}
          </div>
          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary/50">
            Contexto Auto
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <VariableSelector
          nodes={catalogNodes}
          loading={catalogLoading}
          onSelect={(node) =>
            insertPromptToken(textareaRef.current, value, `{{${node.path}}}`, handleChange)
          }
          trigger={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-lg border-border/40 text-[11px] font-semibold uppercase tracking-[0.12em]"
            >
              <Braces size={12} />
              Variables
            </Button>
          }
        />
        {catalogError && <span className="text-[11px] text-destructive">{catalogError}</span>}
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder="Describe lo que la IA debe generar para este bloque..."
        className="min-h-[96px] resize-none rounded-xl border-border/40 bg-background/70 text-sm leading-6"
      />
      <p className="text-[11px] leading-5 text-muted-foreground">
        El registro completo ({`{{root}}`}) y el contexto de la colección se envían automáticamente.
        Inserta variables como {`{{cliente.nombre}}`} para refinar el prompt.
      </p>
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
  const {
    nodes: variableCatalog,
    loading: variableCatalogLoading,
    error: variableCatalogError,
    collectionContext,
  } = useTemplateVariableCatalog();
  const editor = useEditorRef();
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
      <BlockShell icon={<BrainCircuit size={14} />} title="AI Block">
        <TemplateAIInlinePromptEditor
          value={promptValue}
          catalogNodes={variableCatalog}
          catalogLoading={variableCatalogLoading}
          catalogError={variableCatalogError}
          collectionContext={collectionContext}
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
