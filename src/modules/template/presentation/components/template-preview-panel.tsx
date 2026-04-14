"use client";

import { ResizableProvider } from "@platejs/resizable";
import { Sparkles } from "lucide-react";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { PdfPageConfig } from "@/modules/template/domain/types/pdf-page-config";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import { Editor, EditorContainer } from "@/shared/presentation/components/ui/editor";

import { templateBlocksToPlateValue } from "../lib/template-blocks.adapter";
import { PdfPageSectionEditor } from "./pdf-page-section-editor";

interface TemplatePreviewPanelProps {
  blocks: TemplateBlocks;
  pageConfig?: PdfPageConfig | null;
  loading: boolean;
  error?: string | null;
  warnings?: string[];
}

function TemplatePreviewSkeleton() {
  const paragraphWidths = ["w-full", "w-11/12", "w-10/12", "w-9/12"];

  return (
    <div
      data-testid="template-preview-skeleton"
      className="min-h-[1122px] rounded-sm border border-[#e0e0e0] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.12)]"
    >
      <div className="flex min-h-[1122px] flex-col px-[96px] pb-[80px] pt-[80px]">
        <div className="animate-pulse space-y-10">
          <div className="h-10 w-56 rounded-full bg-slate-200/80" />

          <div className="space-y-4">
            {paragraphWidths.map((widthClassName, index) => (
              <div
                key={`intro-line-${index}`}
                className={`h-4 rounded-full bg-slate-200/70 ${widthClassName}`}
              />
            ))}
          </div>

          <div className="space-y-3">
            <div className="h-6 w-44 rounded-full bg-slate-200/80" />
            {["w-full", "w-full", "w-8/12"].map((widthClassName, index) => (
              <div
                key={`body-line-${index}`}
                className={`h-4 rounded-full bg-slate-200/70 ${widthClassName}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={`table-cell-${index}`}
                className="h-14 rounded-xl border border-slate-200/80 bg-slate-100/70"
              />
            ))}
          </div>

          <div className="space-y-4">
            {["w-full", "w-11/12", "w-10/12", "w-7/12"].map((widthClassName, index) => (
              <div
                key={`footer-line-${index}`}
                className={`h-4 rounded-full bg-slate-200/70 ${widthClassName}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplatePreviewPanel({
  blocks,
  pageConfig,
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

  const showLoadingSkeleton = loading;

  return (
    <div className="flex size-full flex-col bg-background p-0">
      <div
        className={[
          "flex-1 overflow-y-auto py-10 px-6",
          "bg-[radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)]",
          "bg-size-[20px_20px]",
        ].join(" ")}
      >
        {/* Notification banners */}
        {(error || warnings.length > 0) && (
          <div className="mx-auto w-[794px] max-w-full mb-4 space-y-2">
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
          </div>
        )}

        {/* A4 sheet */}
        <div className="mx-auto w-[794px] max-w-full">
          <ResizableProvider>
            <div className="relative">
              {showLoadingSkeleton ? (
                <TemplatePreviewSkeleton />
              ) : blocks.length > 0 ? (
                <div className="mx-auto flex w-[794px] max-w-full flex-col shadow-[0_2px_20px_rgba(0,0,0,0.12)]">
                  {/* ── HEADER mini-editor ── */}
                  {pageConfig?.header?.enabled && (
                    <div className="overflow-hidden rounded-t-sm bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]">
                      <PdfPageSectionEditor
                        section="header"
                        value={pageConfig.header}
                        readOnly
                        onChange={() => {}}
                        idSuffix="-preview"
                      />
                    </div>
                  )}

                  {/* ── BODY editor ── */}
                  <Plate editor={previewEditor} readOnly>
                    <EditorContainer className="p-0 border-none shadow-none bg-transparent">
                      <Editor
                        readOnly
                        variant="a4"
                        placeholder=""
                        className={
                          pageConfig?.header?.enabled || pageConfig?.footer?.enabled
                            ? "rounded-none shadow-none border-none"
                            : ""
                        }
                      />
                    </EditorContainer>
                  </Plate>

                  {/* ── FOOTER mini-editor ── */}
                  {pageConfig?.footer?.enabled && (
                    <div className="overflow-hidden rounded-b-sm bg-white shadow-[0_4px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]">
                      <PdfPageSectionEditor
                        section="footer"
                        value={pageConfig.footer}
                        readOnly
                        onChange={() => {}}
                        idSuffix="-preview"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[1122px] items-center justify-center text-sm text-foreground/20 italic bg-white shadow-[0_2px_20px_rgba(0,0,0,0.12)] border border-[#e0e0e0] rounded-sm">
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
