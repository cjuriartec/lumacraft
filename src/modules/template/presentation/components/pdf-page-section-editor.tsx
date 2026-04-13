"use client";

import { BoldPlugin, ItalicPlugin, UnderlinePlugin } from "@platejs/basic-nodes/react";
import { FontColorPlugin } from "@platejs/basic-styles/react";
import { ResizableProvider } from "@platejs/resizable";
import {
  Bold,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Hash,
  Italic,
  Layers,
  Plus,
  Tag,
  Underline,
  X,
} from "lucide-react";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";

import { cn } from "@/shared/lib/utils";
import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import { AlignToolbarButton } from "@/shared/presentation/components/ui/align-toolbar-button";
import { Button } from "@/shared/presentation/components/ui/button";
import { Editor, EditorContainer } from "@/shared/presentation/components/ui/editor";
import { FontColorToolbarButton } from "@/shared/presentation/components/ui/font-color-toolbar-button";
import { FontSizeToolbarButton } from "@/shared/presentation/components/ui/font-size-toolbar-button";
import { MarkToolbarButton } from "@/shared/presentation/components/ui/mark-toolbar-button";
import { MediaToolbarButton } from "@/shared/presentation/components/ui/media-toolbar-button";
import { Toolbar, ToolbarGroup } from "@/shared/presentation/components/ui/toolbar";

import type { PdfHeaderFooterSection } from "../../domain/types/pdf-page-config";
import type { TemplateBlocks } from "../../domain/types/template-blocks";
import {
  plateValueToTemplateBlocks,
  templateBlocksToPlateValue,
} from "../lib/template-blocks.adapter";

// ---------------------------------------------------------------------------
// System variables
// ---------------------------------------------------------------------------

const SYSTEM_VARIABLES = [
  { key: "$page_number", label: "Pág.", icon: Hash, description: "Número de página actual" },
  { key: "$total_pages", label: "Total", icon: Layers, description: "Total de páginas" },
  { key: "$current_date", label: "Fecha", icon: CalendarDays, description: "Fecha de generación" },
  { key: "$template_name", label: "Plantilla", icon: Tag, description: "Nombre de la plantilla" },
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PdfPageSectionEditorProps {
  section: "header" | "footer";
  value: PdfHeaderFooterSection | undefined;
  readOnly?: boolean;
  onChange: (section: PdfHeaderFooterSection | undefined) => void;
  idSuffix?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PdfPageSectionEditor({
  section,
  value,
  readOnly = false,
  onChange,
  idSuffix = "",
}: PdfPageSectionEditorProps) {
  const isHeader = section === "header";
  const isEnabled = value?.enabled ?? false;
  const [collapsed, setCollapsed] = React.useState(false);

  const editorId = `pdf-${section}-editor${idSuffix}`;

  const plateValue = React.useMemo(
    () => templateBlocksToPlateValue(value?.blocks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(value?.blocks)],
  );

  const editor = usePlateEditor({
    id: editorId,
    value: plateValue,
    plugins: [...ExtendedNodesKit],
  });

  // Sync editor when external blocks change
  const prevBlocksRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    const serialised = JSON.stringify(value?.blocks);
    if (serialised !== prevBlocksRef.current) {
      prevBlocksRef.current = serialised;
      editor.tf.setValue(plateValue);
    }
  }, [editor, plateValue, value?.blocks]);

  const handleToggle = React.useCallback(() => {
    if (readOnly) return;
    onChange({ enabled: !isEnabled, blocks: value?.blocks ?? [], height: value?.height });
  }, [isEnabled, onChange, readOnly, value]);

  const handleEditorChange = React.useCallback(
    (blocks: TemplateBlocks) => {
      onChange({ ...(value ?? { enabled: true, blocks: [] }), blocks });
    },
    [onChange, value],
  );

  const insertSystemVariable = React.useCallback(
    (key: string, label: string) => {
      editor.tf.insertNodes([
        { type: "variable", fieldPath: key, fieldType: "TEXT", children: [{ text: label }] },
      ]);
      editor.tf.focus();
    },
    [editor],
  );

  const sectionLabel = isHeader ? "ENCABEZADO" : "PIE DE PÁGINA";

  // ── Disabled: thin strip matching paper width, dashed divider line ────────
  if (!isEnabled) {
    return (
      <div
        className={cn(
          "group/section relative flex min-h-[64px] items-center justify-center",
          "px-[96px]",
          !readOnly &&
            "cursor-pointer bg-transparent transition-all duration-300 hover:bg-surface/20",
        )}
        onClick={readOnly ? undefined : handleToggle}
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        onKeyDown={readOnly ? undefined : (e) => e.key === "Enter" && handleToggle()}
        aria-label={readOnly ? undefined : `Activar ${sectionLabel.toLowerCase()}`}
      >
        <div className="flex items-center gap-2 text-muted-foreground/40 transition-all duration-300 group-hover/section:-translate-y-0.5 group-hover/section:text-primary">
          {!readOnly && (
            <Plus
              className="opacity-0 transition-opacity duration-300 group-hover/section:opacity-100"
              size={13}
            />
          )}
          <span className="select-none text-[10px] font-semibold uppercase tracking-[0.2em] group-hover/section:tracking-[0.22em] transition-all duration-300">
            Añadir {isHeader ? "encabezado" : "pie de página"}
          </span>
        </div>
      </div>
    );
  }

  // ── Enabled ───────────────────────────────────────────────────────────────
  return (
    <Plate
      editor={editor}
      readOnly={readOnly}
      onChange={({ value: v }) => {
        if (!readOnly) handleEditorChange(plateValueToTemplateBlocks(v));
      }}
    >
      <div className="flex flex-col bg-background transition-all duration-300 outline-none pb-2 pt-1">
        {/* ── Annotation strip ─────────────────────────────────────────── */}
        <div className="group/strip flex items-center justify-between px-[96px] py-3 text-muted-foreground/40 transition-colors hover:text-muted-foreground/70">
          <span className="select-none text-[10px] font-semibold uppercase tracking-[0.2em]">
            {sectionLabel}
          </span>

          {!readOnly && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity duration-300 group-hover/strip:opacity-100">
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-current transition-all duration-200 hover:bg-surface/50 hover:text-foreground"
                title={collapsed ? "Expandir" : "Contraer"}
              >
                {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
              <button
                type="button"
                onClick={handleToggle}
                className="flex h-6 w-6 items-center justify-center rounded-full text-current transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
                title={`Quitar ${isHeader ? "encabezado" : "pie de página"}`}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {/* ── Editor canvas ─────────────────────────────────────────────── */}
        {!collapsed && (
          <ResizableProvider>
            <EditorContainer className="overflow-visible border-none bg-transparent shadow-none">
              <Editor
                readOnly={readOnly}
                variant="none"
                className={cn(
                  "min-h-[40px] w-full px-[96px] pb-4 pt-1",
                  "text-[10pt] leading-relaxed",
                  "bg-white text-zinc-900",
                  "focus-visible:outline-none",
                  readOnly && "cursor-default select-text",
                )}
                placeholder={
                  readOnly ? "" : `Escribe el ${isHeader ? "encabezado" : "pie de página"}...`
                }
              />
            </EditorContainer>
          </ResizableProvider>
        )}

        {/* ── Toolbar ──────────────────────────────────────────────────── */}
        {!readOnly && !collapsed && (
          <div className="flex w-full justify-center px-[96px] pb-3 pt-1">
            <Toolbar className="flex items-center justify-center gap-1 rounded-full border border-border/20 bg-surface/50 px-3 py-1 shadow-sm focus-visible:outline-none">
              <ToolbarGroup className="gap-0">
                <MarkToolbarButton
                  nodeType={BoldPlugin.key}
                  tooltip="Negrita"
                  className="h-6 w-6 rounded-full p-0"
                >
                  <Bold size={11} />
                </MarkToolbarButton>
                <MarkToolbarButton
                  nodeType={ItalicPlugin.key}
                  tooltip="Cursiva"
                  className="h-6 w-6 rounded-full p-0"
                >
                  <Italic size={11} />
                </MarkToolbarButton>
                <MarkToolbarButton
                  nodeType={UnderlinePlugin.key}
                  tooltip="Subrayado"
                  className="h-6 w-6 rounded-full p-0"
                >
                  <Underline size={11} />
                </MarkToolbarButton>
              </ToolbarGroup>

              <div className="mx-0.5 h-3 w-px bg-border/40" />

              <ToolbarGroup className="gap-0">
                <div className="scale-90 origin-center">
                  <FontSizeToolbarButton />
                </div>
                <div className="scale-90 origin-center">
                  <FontColorToolbarButton nodeType={FontColorPlugin.key} tooltip="Color de texto" />
                </div>
              </ToolbarGroup>

              <div className="mx-0.5 h-3 w-px bg-border/40" />

              <ToolbarGroup className="gap-0 scale-90 origin-center">
                <AlignToolbarButton />
              </ToolbarGroup>

              <div className="mx-0.5 h-3 w-px bg-border/40" />

              <ToolbarGroup className="gap-0 scale-90 origin-center">
                <MediaToolbarButton nodeType="img" />
              </ToolbarGroup>

              <div className="mx-0.5 h-3 w-px bg-border/40" />

              {/* System variables */}
              <ToolbarGroup className="gap-0">
                <div className="flex items-center gap-0">
                  {SYSTEM_VARIABLES.map(({ key, label, icon: Icon, description }) => (
                    <Button
                      key={key}
                      variant="ghost"
                      size="icon"
                      className="cursor-pointer h-8 w-8"
                      title={description}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertSystemVariable(key, label);
                      }}
                    >
                      <Icon size={11} />
                      <span className="sr-only">{label}</span>
                    </Button>
                  ))}
                </div>
              </ToolbarGroup>
            </Toolbar>
          </div>
        )}
      </div>
    </Plate>
  );
}
