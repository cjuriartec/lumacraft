"use client";

import {
  BoldPlugin,
  CodePlugin,
  HighlightPlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { FontColorPlugin } from "@platejs/basic-styles/react";
import { ResizableProvider } from "@platejs/resizable";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Code,
  Database,
  Highlighter,
  RotateCw,
  Strikethrough,
} from "lucide-react";
import Link from "next/link";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { getShortcutText } from "@/shared/lib/utils";
import { DndKit } from "@/shared/presentation/components/editor/plugins/dnd-kit";
import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import { AlignToolbarButton } from "@/shared/presentation/components/ui/align-toolbar-button";
import { Button } from "@/shared/presentation/components/ui/button";
import { Editor, EditorContainer } from "@/shared/presentation/components/ui/editor";
import { FixedToolbar } from "@/shared/presentation/components/ui/fixed-toolbar";
import { FontColorToolbarButton } from "@/shared/presentation/components/ui/font-color-toolbar-button";
import { FontSizeToolbarButton } from "@/shared/presentation/components/ui/font-size-toolbar-button";
import {
  RedoToolbarButton,
  UndoToolbarButton,
} from "@/shared/presentation/components/ui/history-toolbar-button";
import { LineHeightToolbarButton } from "@/shared/presentation/components/ui/line-height-toolbar-button";
import { LinkToolbarButton } from "@/shared/presentation/components/ui/link-toolbar-button";
import {
  BulletedListToolbarButton,
  NumberedListToolbarButton,
} from "@/shared/presentation/components/ui/list-toolbar-button";
import { MarkToolbarButton } from "@/shared/presentation/components/ui/mark-toolbar-button";
import { MediaToolbarButton } from "@/shared/presentation/components/ui/media-toolbar-button";
import { TableToolbarButton } from "@/shared/presentation/components/ui/table-toolbar-button";
import { ToolbarGroup } from "@/shared/presentation/components/ui/toolbar";
import { TooltipProvider } from "@/shared/presentation/components/ui/tooltip";
import { TurnIntoToolbarButton } from "@/shared/presentation/components/ui/turn-into-toolbar-button";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import type { VariableElementNode } from "../components/variable-block";
import { VARIABLE_TYPE, VariableElement, VariablePlugin } from "../components/variable-block";
import { VariableSelector } from "../components/variable-selector";
import { useTemplateEditor } from "../hooks/use-template-editor";
import {
  plateValueToTemplateBlocks,
  templateBlocksToPlateValue,
} from "../lib/template-blocks.adapter";

interface TemplateEditorPageProps {
  templateId: string;
}

export default function TemplateEditorPage({ templateId }: TemplateEditorPageProps) {
  const { template, loading, saveStatus, handleBlocksChange, updateName } =
    useTemplateEditor(templateId);
  const { collections } = useCollections();

  const [localName, setLocalName] = React.useState(template?.name || "");

  // Update local name when template loads or changes from elsewhere
  React.useEffect(() => {
    if (template?.name && template.name !== localName) {
      setLocalName(template.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.name]);

  // Debounced name update
  React.useEffect(() => {
    if (!template || localName === template.name) return;

    const timeout = setTimeout(() => {
      updateName(localName);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [localName, template, updateName]);

  useBreadcrumbs([
    { label: "Documentos", href: "/templates" },
    { label: template?.name || "Cargando..." },
  ]);

  const collectionName = React.useMemo(() => {
    if (!template?.collectionId) return "N/A";
    const c = collections.find((col) => col.id === template.collectionId);
    return c ? c.displayName || c.name : "Colección";
  }, [template, collections]);
  const plateValue = React.useMemo(
    () => templateBlocksToPlateValue(template?.blocks),
    [template?.blocks],
  );

  const editor = usePlateEditor({
    id: templateId,
    value: plateValue,
    plugins: [
      ...ExtendedNodesKit,
      VariablePlugin.configure({
        options: {
          collectionId: template?.collectionId || undefined,
        },
      }),
      BlockSelectionPlugin,
      ...DndKit,
    ],
    override: {
      components: {
        [VARIABLE_TYPE]: VariableElement,
      },
    },
  });

  // Synchronize editor value when template data arrives
  const isFirstLoad = React.useRef(true);
  React.useEffect(() => {
    isFirstLoad.current = true;
  }, [templateId]);

  React.useEffect(() => {
    if (template && isFirstLoad.current) {
      isFirstLoad.current = false;
      editor.tf.setValue(plateValue);
    }
  }, [template, editor, plateValue]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RotateCw className="animate-spin text-primary/50" size={32} />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="mx-auto text-destructive mb-4" size={48} />
        <h2 className="text-xl font-bold">Template no encontrado</h2>
        <Button variant="link" asChild className="mt-4">
          <Link href="/templates">Volver a Documentos</Link>
        </Button>
      </div>
    );
  }

  return (
    <Plate
      editor={editor}
      onChange={({ value }) => handleBlocksChange(plateValueToTemplateBlocks(value))}
    >
      <TooltipProvider>
        <div className="flex h-full flex-col">
          {/* Editor Header Bar */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild className="rounded-full">
                <Link href="/templates">
                  <ArrowLeft size={18} />
                </Link>
              </Button>
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <input
                    className="min-w-[200px] border-none bg-transparent p-0 text-lg font-bold text-foreground outline-none focus:ring-0"
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                  />
                  <span className="flex items-center gap-1.5 rounded border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                    <Database size={10} />
                    {collectionName}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[12px] font-medium transition-all duration-300">
                {saveStatus === "saving" && (
                  <>
                    <RotateCw className="animate-spin text-primary" size={14} />
                    <span className="text-foreground/60">Guardando...</span>
                  </>
                )}
                {saveStatus === "saved" && (
                  <>
                    <CheckCircle2 className="text-primary" size={14} />
                    <span className="text-foreground/60">Guardado</span>
                  </>
                )}
                {saveStatus === "error" && (
                  <>
                    <AlertCircle className="text-destructive" size={14} />
                    <span className="text-destructive/80">Error al guardar</span>
                  </>
                )}
                {saveStatus === "idle" && (
                  <>
                    <Cloud className="text-foreground/20" size={14} />
                    <span className="text-foreground/30">Sincronizado</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Plate Toolbar */}
          <div className="sticky top-[57px] z-10 overflow-x-auto px-4">
            <div className="mx-auto max-w-7xl rounded-lg bg-surface/90 px-6 backdrop-blur-sm">
              <FixedToolbar className="bg-transparent backdrop-blur-none shadow-none">
                <ToolbarGroup>
                  <UndoToolbarButton />
                  <RedoToolbarButton />
                </ToolbarGroup>

                <ToolbarGroup>
                  <TurnIntoToolbarButton />
                </ToolbarGroup>

                <ToolbarGroup>
                  <MarkToolbarButton
                    nodeType={BoldPlugin.key}
                    tooltip={`Negrita (${getShortcutText()}B)`}
                  >
                    <span className="font-bold">B</span>
                  </MarkToolbarButton>
                  <MarkToolbarButton
                    nodeType={ItalicPlugin.key}
                    tooltip={`Cursiva (${getShortcutText()}I)`}
                  >
                    <span className="italic">I</span>
                  </MarkToolbarButton>
                  <MarkToolbarButton
                    nodeType={UnderlinePlugin.key}
                    tooltip={`Subrayado (${getShortcutText()}U)`}
                  >
                    <span className="underline">U</span>
                  </MarkToolbarButton>
                  <MarkToolbarButton
                    nodeType={StrikethroughPlugin.key}
                    tooltip={`Tachado (${getShortcutText()}S)`}
                  >
                    <Strikethrough size={16} />
                  </MarkToolbarButton>
                  <MarkToolbarButton
                    nodeType={CodePlugin.key}
                    tooltip={`Código (${getShortcutText()}E)`}
                  >
                    <Code size={16} />
                  </MarkToolbarButton>
                  <MarkToolbarButton
                    nodeType={HighlightPlugin.key}
                    tooltip={`Resaltar (${getShortcutText()}H)`}
                  >
                    <Highlighter size={16} />
                  </MarkToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup>
                  <FontSizeToolbarButton />
                  <FontColorToolbarButton nodeType={FontColorPlugin.key} tooltip="Color de texto" />
                </ToolbarGroup>

                <ToolbarGroup>
                  <AlignToolbarButton />
                  <LineHeightToolbarButton />
                </ToolbarGroup>

                <ToolbarGroup>
                  <BulletedListToolbarButton />
                  <NumberedListToolbarButton />
                </ToolbarGroup>

                <ToolbarGroup>
                  <LinkToolbarButton />
                  <TableToolbarButton />
                  <MediaToolbarButton nodeType="img" />
                </ToolbarGroup>

                <ToolbarGroup>
                  <VariableSelector
                    collectionId={template.collectionId}
                    disabled={!template.collectionId}
                    onSelect={(node) => {
                      const variableNode: VariableElementNode = {
                        type: VARIABLE_TYPE,
                        fieldPath: node.path,
                        collectionId: node.collectionId,
                        children: [{ text: "" }],
                      };

                      editor.tf.insertNodes([variableNode]);
                      editor.tf.focus();
                    }}
                  />
                  {!template.collectionId && (
                    <span className="text-xs text-muted-foreground">
                      Vincula una colección para insertar variables.
                    </span>
                  )}
                </ToolbarGroup>
              </FixedToolbar>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto bg-background/40 px-6 py-10">
            <div className="mx-auto max-w-5xl space-y-6">
              <ResizableProvider>
                <EditorContainer>
                  <Editor
                    placeholder="Comienza a escribir tu documento..."
                    variant="demo"
                    className="min-h-[800px]"
                  />
                </EditorContainer>
              </ResizableProvider>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </Plate>
  );
}
