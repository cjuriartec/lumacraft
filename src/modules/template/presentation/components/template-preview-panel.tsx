"use client";

import { ResizableProvider } from "@platejs/resizable";
import { Sparkles } from "lucide-react";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import { Editor, EditorContainer } from "@/shared/presentation/components/ui/editor";

import { templateBlocksToPlateValue } from "../lib/template-blocks.adapter";

interface TemplatePreviewPanelProps {
  blocks: TemplateBlocks;
  loading: boolean;
  error?: string | null;
  warnings?: string[];
}

export function TemplatePreviewPanel({
  blocks,
  loading,
  error,
  warnings = [],
}: TemplatePreviewPanelProps) {
  const previewPlateValue = React.useMemo(() => templateBlocksToPlateValue(blocks), [blocks]);
  const previewEditor = usePlateEditor({
    id: "template-compiled-preview",
    value: previewPlateValue,
    plugins: [...ExtendedNodesKit],
  });

  React.useEffect(() => {
    previewEditor.tf.setValue(previewPlateValue);
  }, [previewEditor, previewPlateValue]);

  return (
    <div className="flex size-full flex-col bg-background p-0">
      <div className="flex-1 overflow-y-auto bg-background/40 px-6 py-5">
        <div className="mx-auto max-w-5xl space-y-6">
          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
              <div className="space-y-1">
                {warnings.map((warning, index) => (
                  <p key={`${warning}-${index}`}>• {warning}</p>
                ))}
              </div>
            </div>
          )}

          <ResizableProvider>
            <div className="relative">
              {blocks.length > 0 ? (
                <Plate editor={previewEditor} readOnly>
                  <EditorContainer className="p-0 border-none shadow-none bg-transparent">
                    <Editor readOnly variant="demo" className="min-h-[800px]" placeholder="" />
                  </EditorContainer>
                </Plate>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-sm text-foreground/20 italic">
                  {loading
                    ? "Recomponiendo documento..."
                    : "Selecciona un registro para previsualizar"}
                </div>
              )}

              {loading && (
                <div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                  <Sparkles size={14} className="animate-pulse" />
                  Generando documento
                </div>
              )}
            </div>
          </ResizableProvider>
        </div>
      </div>
    </div>
  );
}
