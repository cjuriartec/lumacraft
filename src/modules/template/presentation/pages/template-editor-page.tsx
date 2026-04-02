"use client";

import { BoldPlugin, ItalicPlugin, UnderlinePlugin } from "@platejs/basic-nodes/react";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { AlertCircle, ArrowLeft, CheckCircle2, Cloud, Database, RotateCw } from "lucide-react";
import Link from "next/link";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { getShortcutText } from "@/shared/lib/utils";
import { BasicNodesKit } from "@/shared/presentation/components/editor/plugins/basic-nodes-kit";
import { DndKit } from "@/shared/presentation/components/editor/plugins/dnd-kit";
import { Button } from "@/shared/presentation/components/ui/button";
import { Editor, EditorContainer } from "@/shared/presentation/components/ui/editor";
import { FixedToolbar } from "@/shared/presentation/components/ui/fixed-toolbar";
import { MarkToolbarButton } from "@/shared/presentation/components/ui/mark-toolbar-button";
import { ToolbarGroup } from "@/shared/presentation/components/ui/toolbar";
import { TooltipProvider } from "@/shared/presentation/components/ui/tooltip";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { VARIABLE_TYPE, VariableElement, VariablePlugin } from "../components/variable-block";
import { VariableSelector } from "../components/variable-selector";
import { useTemplateEditor } from "../hooks/use-template-editor";

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

  const editor = usePlateEditor({
    id: templateId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: (template?.blocks as any) || [],
    plugins: [
      ...BasicNodesKit,
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
    <Plate editor={editor} onChange={({ value }) => handleBlocksChange(value)}>
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
          <div className="no-scrollbar sticky top-[57px] z-10 overflow-x-auto">
            <div className="mx-auto max-w-5xl rounded-lg bg-surface-hover/90 px-6 backdrop-blur-sm">
              <FixedToolbar className="bg-transparent backdrop-blur-none shadow-none">
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
                </ToolbarGroup>

                <ToolbarGroup>
                  <VariableSelector
                    collectionId={template.collectionId!}
                    onSelect={(node) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (editor as any).insertNodes([
                        {
                          type: VARIABLE_TYPE,
                          fieldPath: node.path,
                          collectionId: node.collectionId,
                          children: [{ text: "" }],
                        },
                      ]);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (editor as any).focus();
                    }}
                  />
                </ToolbarGroup>
              </FixedToolbar>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto px-6 py-10">
            <div className="mx-auto max-w-4xl">
              <EditorContainer>
                <Editor
                  placeholder="Comienza a escribir tu documento..."
                  variant="demo"
                  className="min-h-[500px]"
                />
              </EditorContainer>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </Plate>
  );
}
