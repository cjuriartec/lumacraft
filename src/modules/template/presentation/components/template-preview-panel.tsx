"use client";

import { ResizableProvider } from "@platejs/resizable";
import { AlertCircle, Sparkles } from "lucide-react";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { TemplatePreviewBlockState } from "@/modules/template/application/services/template-preview.types";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { cn } from "@/shared/lib/utils";
import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import { Button } from "@/shared/presentation/components/ui/button";
import { Editor, EditorContainer } from "@/shared/presentation/components/ui/editor";

import { templateBlocksToPlateValue } from "../lib/template-blocks.adapter";

interface PreviewRecordOption {
  id: string;
  data: Record<string, unknown>;
}

interface TemplatePreviewPanelProps {
  collectionLinked: boolean;
  records: PreviewRecordOption[];
  recordsLoading: boolean;
  selectedRecordId: string;
  setSelectedRecordId: (recordId: string) => void;
  loading: boolean;
  error: string | null;
  warnings: string[];
  blocks: TemplateBlocks;
  blockStates: TemplatePreviewBlockState[];
  primaryFieldName?: string | null;
  onGenerate: () => void;
  onCancel: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPreviewLabelValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (isRecord(value) && typeof value.name === "string" && value.name.trim().length > 0) {
    return value.name.trim();
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
          return String(item);
        }

        if (isRecord(item) && typeof item.name === "string") {
          return item.name;
        }

        return "";
      })
      .filter((item) => item.trim().length > 0);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  }

  return "";
}

function getBlockChipTone(state: TemplatePreviewBlockState["status"]) {
  switch (state) {
    case "error":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "resolved":
      return "border-primary/20 bg-primary/10 text-primary";
    default:
      return "border-border/50 bg-surface text-foreground/70";
  }
}

export function TemplatePreviewPanel({
  collectionLinked,
  records,
  recordsLoading,
  selectedRecordId,
  setSelectedRecordId,
  loading,
  error,
  warnings,
  blocks,
  blockStates,
  primaryFieldName,
  onGenerate,
  onCancel,
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
    <div className="rounded-2xl border border-border/40 bg-surface/80 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Preview Compilado
          </p>
          <p className="text-sm text-foreground/70">Ejecuta logica + IA sobre un registro real</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 min-w-[180px] rounded-md border border-border/60 bg-background px-2 text-sm"
            value={selectedRecordId}
            onChange={(event) => setSelectedRecordId(event.target.value)}
            disabled={!collectionLinked || recordsLoading || loading}
          >
            {!collectionLinked ? (
              <option value="">Sin coleccion vinculada</option>
            ) : records.length === 0 ? (
              <option value="">Sin registros disponibles</option>
            ) : (
              records.map((record) => {
                const primaryValue = primaryFieldName
                  ? toPreviewLabelValue(record.data[primaryFieldName])
                  : "";
                const optionLabel = primaryValue.length > 0 ? primaryValue : record.id.slice(0, 8);

                return (
                  <option key={record.id} value={record.id}>
                    {optionLabel}
                  </option>
                );
              })
            )}
          </select>

          <Button
            type="button"
            size="sm"
            className="gap-1.5"
            disabled={!collectionLinked || !selectedRecordId || loading}
            onClick={onGenerate}
          >
            <Sparkles size={14} />
            {loading ? "Generando..." : "Generar Preview"}
          </Button>

          {loading && (
            <Button type="button" size="sm" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {!collectionLinked && (
        <p className="mb-3 text-sm text-muted-foreground">
          Vincula una coleccion a la plantilla para habilitar el preview.
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-300/40 bg-amber-100/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {warnings.map((warning, index) => (
            <p key={`${warning}-${index}`}>{warning}</p>
          ))}
        </div>
      )}

      {blockStates.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {blockStates.map((state) => (
            <span
              key={state.blockId}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                getBlockChipTone(state.status),
              )}
            >
              {state.blockType}
              {state.branch ? ` · ${state.branch}` : ""}
              {typeof state.itemCount === "number" ? ` · ${state.itemCount}` : ""}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border/50 bg-background p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Documento Compilado
        </p>

        <ResizableProvider>
          <div className="relative">
            {blocks.length > 0 ? (
              <Plate editor={previewEditor} readOnly>
                <EditorContainer>
                  <Editor
                    readOnly
                    variant="demo"
                    className="max-h-[520px] min-h-[280px] overflow-y-auto"
                    placeholder=""
                  />
                </EditorContainer>
              </Plate>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground italic bg-surface/10 rounded-lg border border-dashed border-border/40">
                {loading ? "Iniciando generacion..." : "El preview se mostrara aqui."}
              </div>
            )}

            {loading && (
              <div className="absolute top-2 right-4 flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles size={10} />
                Generando
              </div>
            )}
          </div>
        </ResizableProvider>
      </div>

      {blockStates.some((state) => state.aiText && state.aiText.trim().length > 0) && (
        <div className="mt-4 rounded-xl border border-border/40 bg-background/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <AlertCircle size={12} />
            Estado IA por bloque
          </div>
          <div className="space-y-2">
            {blockStates
              .filter((state) => state.aiText && state.aiText.trim().length > 0)
              .map((state) => (
                <div
                  key={`${state.blockId}-ai`}
                  className="rounded-lg border border-border/40 bg-surface/60 p-2"
                >
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {state.blockType}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-foreground/80">{state.aiText}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
