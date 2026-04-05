"use client";

import { Braces, BrainCircuit, GitBranch, ListTree, Split } from "lucide-react";
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

import { useTemplateVariableCatalog } from "../contexts/template-variable-catalog-context";
import { LogicBlockEditorDialog } from "./logic-block-editor-dialog";

export const TEMPLATE_CONDITIONAL_TYPE = "template_conditional";
export const TEMPLATE_LIST_TYPE = "template_list";
export const TEMPLATE_SWITCH_TYPE = "template_switch";
export const TEMPLATE_AI_TYPE = "template_ai";
export const DEFAULT_TEMPLATE_AI_PROMPT =
  "Resume el registro actual usando {{root}}. Destaca datos clave y no inventes informacion.";

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
  provider?: "GEMINI" | "OPENAI" | "ANTHROPIC";
  model?: string;
  temperature?: number;
  maxTokens?: number;
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
    provider: "GEMINI",
    temperature: 0.2,
    maxTokens: 300,
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
  } = useTemplateVariableCatalog();
  const editor = useEditorRef();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleEdit = () => {
    setIsDialogOpen(true);
  };

  const onSave = (updatedElement: Partial<TemplateAIElementNode>) => {
    const path = editor.api.findPath(element);
    if (!path) return;

    editor.tf.setNodes(updatedElement, { at: path });
  };

  return (
    <PlateElement {...props} as="div" attributes={attributes}>
      <BlockShell icon={<BrainCircuit size={14} />} title="AI Block">
        <p className="line-clamp-2 text-xs text-foreground/80">{element.promptTemplate}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          provider: <b>GEMINI</b>
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
