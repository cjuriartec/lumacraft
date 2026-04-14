"use client";

import {
  BoldPlugin,
  HighlightPlugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { FontBackgroundColorPlugin, FontColorPlugin } from "@platejs/basic-styles/react";
import { ResizableProvider } from "@platejs/resizable";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  FileText,
  Highlighter,
  PaintBucket,
  RefreshCw,
  RotateCw,
  Strikethrough,
} from "lucide-react";
import Link from "next/link";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { formatShortRecordId } from "@/modules/collection/domain/services/record-label.service";
import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { useGuidancePage } from "@/modules/guidance/presentation/hooks/use-guidance-page";
import { FontFamilyToolbarButton } from "@/modules/template/presentation/components/font-family-toolbar-button";
import { PdfPageSectionEditor } from "@/modules/template/presentation/components/pdf-page-section-editor";
import {
  plateValueToTemplateBlocks,
  templateBlocksToPlateValue,
} from "@/modules/template/presentation/lib/template-blocks.adapter";
import { cn, getShortcutText } from "@/shared/lib/utils";
import { DndKit } from "@/shared/presentation/components/editor/plugins/dnd-kit";
import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/presentation/components/ui/alert-dialog";
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
import {
  IndentToolbarButton,
  OutdentToolbarButton,
} from "@/shared/presentation/components/ui/indent-toolbar-button";
import { LineHeightToolbarButton } from "@/shared/presentation/components/ui/line-height-toolbar-button";
import { LinkToolbarButton } from "@/shared/presentation/components/ui/link-toolbar-button";
import {
  BulletedListToolbarButton,
  NumberedListToolbarButton,
} from "@/shared/presentation/components/ui/list-toolbar-button";
import { MarkToolbarButton } from "@/shared/presentation/components/ui/mark-toolbar-button";
import { TableToolbarButton } from "@/shared/presentation/components/ui/table-toolbar-button";
import { ToolbarGroup } from "@/shared/presentation/components/ui/toolbar";
import { TooltipProvider } from "@/shared/presentation/components/ui/tooltip";
import { TurnIntoToolbarButton } from "@/shared/presentation/components/ui/turn-into-toolbar-button";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { useRecordDocument } from "../hooks/use-record-document";

interface RecordDocumentEditorPageProps {
  collectionId: string;
  recordId: string;
  templateId: string;
}

export default function RecordDocumentEditorPage({
  collectionId,
  recordId,
  templateId,
}: RecordDocumentEditorPageProps) {
  const { collections } = useCollections();
  const { trackMilestone } = useGuidance();
  useGuidancePage({ id: "document-editor" });
  const {
    payload,
    loading,
    loadingPhase,
    error,
    saveStatus,
    regenerating,
    editorRevision,
    handleBlocksChange,
    regenerate,
    reload,
    pdfUrl,
  } = useRecordDocument({
    collectionId,
    recordId,
    templateId,
  });

  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = React.useState(false);
  const skipEditorSyncChangeRef = React.useRef(false);
  const lastAppliedEditorRevisionRef = React.useRef<number | null>(null);
  const hasTrackedOpenRef = React.useRef(false);
  const collection = collections.find((item) => item.id === collectionId) ?? null;
  const collectionName = collection?.displayName || collection?.name || "Colección";
  const recordLabel = payload?.record.label ?? formatShortRecordId(recordId);
  const templateName = payload?.template.name ?? "Documento";
  const canUpdate = payload?.permissions.canUpdate ?? false;
  const hasTemplateVersionMismatch =
    payload && payload.document.sourceTemplateVersion !== payload.template.version;

  useBreadcrumbs([
    { label: "Colecciones", href: "/collections" },
    { label: collectionName, href: `/collections/${collectionId}` },
    { label: recordLabel, href: `/collections/${collectionId}/records/${recordId}` },
    { label: templateName },
  ]);

  const editor = usePlateEditor({
    id: `record-document-${templateId}-${recordId}`,
    value: templateBlocksToPlateValue(payload?.document.editedBlocks),
    plugins: [...ExtendedNodesKit, BlockSelectionPlugin, ...DndKit],
  });

  React.useEffect(() => {
    if (!payload) return;
    if (lastAppliedEditorRevisionRef.current === editorRevision) return;

    lastAppliedEditorRevisionRef.current = editorRevision;
    skipEditorSyncChangeRef.current = true;
    editor.tf.setValue(templateBlocksToPlateValue(payload.document.editedBlocks));
    queueMicrotask(() => {
      skipEditorSyncChangeRef.current = false;
    });
  }, [editor, editorRevision, payload]);

  React.useEffect(() => {
    if (!payload || hasTrackedOpenRef.current) return;

    hasTrackedOpenRef.current = true;
    void trackMilestone("document_opened");
  }, [payload, trackMilestone]);

  const handleConfirmRegenerate = React.useCallback(async () => {
    const success = await regenerate();
    if (success) {
      void trackMilestone("document_opened");
      setIsRegenerateDialogOpen(false);
    }
  }, [regenerate, trackMilestone]);

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <RotateCw className="animate-spin text-primary/50" size={32} />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {loadingPhase === "compiling"
              ? "Compilando documento por primera vez..."
              : "Cargando documento..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {loadingPhase === "compiling"
              ? "Se guardará la versión compilada para accesos futuros."
              : "Recuperando la versión persistida."}
          </p>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="text-destructive" size={40} />
        <div className="space-y-2">
          <p className="text-base font-semibold text-foreground">
            No fue posible abrir el documento
          </p>
          <p className="text-sm text-muted-foreground">{error ?? "Inténtalo nuevamente."}</p>
        </div>
        <Button onClick={() => void reload()} className="gap-2">
          <RefreshCw size={14} />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <>
      <Plate
        editor={editor}
        readOnly={!canUpdate}
        onChange={({ value }) => {
          if (!canUpdate) {
            return;
          }

          if (skipEditorSyncChangeRef.current) {
            return;
          }

          handleBlocksChange(plateValueToTemplateBlocks(value));
        }}
      >
        <TooltipProvider disableHoverableContent>
          <div className="flex h-dvh flex-col overflow-hidden bg-background">
            <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                  <Link href={`/collections/${collectionId}`}>
                    <ArrowLeft size={18} />
                  </Link>
                </Button>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-lg font-bold text-foreground">{templateName}</h1>
                    <span className="flex items-center gap-1.5 rounded border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                      <FileText size={10} />
                      {recordLabel}
                    </span>
                    {!canUpdate && (
                      <span className="rounded border border-foreground/10 bg-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                        Solo lectura
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {canUpdate && (
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
                )}

                <Button variant="ghost" size="sm" asChild className="h-9 gap-2 cursor-pointer">
                  <Link
                    href={`/collections/${collectionId}/templates/${templateId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    <span className="text-[11px]">Plantilla</span>
                  </Link>
                </Button>

                <Button
                  data-guidance-anchor="document-download-pdf"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2 cursor-pointer"
                  onClick={() => window.open(pdfUrl, "_blank", "noopener")}
                  aria-label="Descargar PDF"
                >
                  <Download size={14} />
                </Button>

                {canUpdate && (
                  <Button
                    data-guidance-anchor="document-regenerate"
                    size="sm"
                    variant="secondary"
                    className="h-9 gap-2 cursor-pointer"
                    disabled={regenerating}
                    onClick={() => setIsRegenerateDialogOpen(true)}
                  >
                    {regenerating ? (
                      <RotateCw size={14} className="animate-spin" />
                    ) : (
                      <RefreshCw size={14} />
                    )}
                    {regenerating ? "Regenerando..." : "Regenerar"}
                  </Button>
                )}
              </div>
            </div>

            {canUpdate && (
              <div className="sticky top-[57px] z-10 overflow-x-auto px-4">
                <div className="mx-auto max-w-7xl rounded-lg bg-surface/90 px-6 backdrop-blur-sm shadow-sm border border-border/10">
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
                        nodeType={HighlightPlugin.key}
                        tooltip={`Resaltar (${getShortcutText()}H)`}
                      >
                        <Highlighter size={16} />
                      </MarkToolbarButton>
                    </ToolbarGroup>

                    <ToolbarGroup>
                      <FontFamilyToolbarButton />
                      <FontSizeToolbarButton />
                      <FontColorToolbarButton
                        nodeType={FontColorPlugin.key}
                        tooltip="Color de texto"
                      />
                      <FontColorToolbarButton
                        nodeType={FontBackgroundColorPlugin.key}
                        tooltip="Color de fondo"
                      >
                        <PaintBucket size={16} />
                      </FontColorToolbarButton>
                    </ToolbarGroup>

                    <ToolbarGroup>
                      <AlignToolbarButton />
                      <LineHeightToolbarButton />
                      <OutdentToolbarButton />
                      <IndentToolbarButton />
                    </ToolbarGroup>

                    <ToolbarGroup>
                      <BulletedListToolbarButton />
                      <NumberedListToolbarButton />
                    </ToolbarGroup>

                    <ToolbarGroup>
                      <LinkToolbarButton />
                      <TableToolbarButton />
                    </ToolbarGroup>
                  </FixedToolbar>
                </div>
              </div>
            )}

            <div
              className={cn(
                "flex-1 overflow-y-auto py-10 px-6",
                "bg-[radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)]",
                "bg-size-[20px_20px]",
                !canUpdate && "pt-6",
              )}
            >
              {(error || payload.warnings.length > 0 || hasTemplateVersionMismatch) && (
                <div className="mx-auto mb-4 w-[794px] max-w-full space-y-2">
                  {error && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  {hasTemplateVersionMismatch && (
                    <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                      Este documento fue compilado con la versión{" "}
                      <span className="font-semibold">
                        {payload.document.sourceTemplateVersion}
                      </span>{" "}
                      del template. La versión actual es{" "}
                      <span className="font-semibold">{payload.template.version}</span>. Usa
                      Regenerar para aplicar los cambios más recientes.
                    </div>
                  )}
                  {payload.warnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                      <div className="space-y-1">
                        {payload.warnings.map((warning, index) => (
                          <p key={`${warning}-${index}`}>• {warning}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mx-auto flex w-[794px] max-w-full flex-col shadow-[0_2px_20px_rgba(0,0,0,0.12)]">
                {/* ── HEADER mini-editor ── */}
                {payload.template.pageConfig?.header?.enabled && (
                  <div className="overflow-hidden rounded-t-sm bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]">
                    <PdfPageSectionEditor
                      section="header"
                      value={payload.template.pageConfig.header}
                      readOnly
                      onChange={() => {}}
                      idSuffix="-record"
                    />
                  </div>
                )}

                <ResizableProvider>
                  <EditorContainer className="p-0 border-none shadow-none bg-transparent">
                    <Editor
                      readOnly={!canUpdate}
                      placeholder={canUpdate ? "Edita el documento..." : ""}
                      variant="a4"
                      className={
                        payload.template.pageConfig?.header?.enabled ||
                        payload.template.pageConfig?.footer?.enabled
                          ? "rounded-none shadow-none border-none"
                          : ""
                      }
                    />
                  </EditorContainer>
                </ResizableProvider>

                {/* ── FOOTER mini-editor ── */}
                {payload.template.pageConfig?.footer?.enabled && (
                  <div className="overflow-hidden rounded-b-sm bg-white shadow-[0_4px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]">
                    <PdfPageSectionEditor
                      section="footer"
                      value={payload.template.pageConfig.footer}
                      readOnly
                      onChange={() => {}}
                      idSuffix="-record"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </Plate>

      <AlertDialog
        open={isRegenerateDialogOpen}
        onOpenChange={(open) => {
          if (!regenerating) {
            setIsRegenerateDialogOpen(open);
          }
        }}
      >
        <AlertDialogContent className="border-0 bg-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción reemplazará la versión editada actual por una nueva compilación del
              template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={regenerating}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRegenerate();
              }}
            >
              {regenerating ? (
                <>
                  <RotateCw className="animate-spin" />
                  Regenerando...
                </>
              ) : (
                "Regenerar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
