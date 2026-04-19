"use client";

import {
  BoldPlugin,
  CodePlugin,
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
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Code,
  Database,
  Eye,
  GitBranch,
  Highlighter,
  ListTree,
  PaintBucket,
  RotateCw,
  Sparkles,
  SquareSplitHorizontal,
  Strikethrough,
} from "lucide-react";
import Link from "next/link";
import { Plate, type PlateElementProps, usePlateEditor } from "platejs/react";
import * as React from "react";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import {
  formatShortRecordId,
  toRecordLabelValue,
} from "@/modules/collection/domain/services/record-label.service";
import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { useGuidancePage } from "@/modules/guidance/presentation/hooks/use-guidance-page";
import { TEMPLATE_PREVIEW_MAX_EAGER_DEPTH } from "@/modules/template/application/constants/template-preview.constants";
import { analyzeTemplateDependencies } from "@/modules/template/application/services/template-dependency-analyzer";
import type { PdfPageConfig } from "@/modules/template/domain/types/pdf-page-config";
import { cn, getShortcutText } from "@/shared/lib/utils";
import { DndKit } from "@/shared/presentation/components/editor/plugins/dnd-kit";
import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import { AlignToolbarButton } from "@/shared/presentation/components/ui/align-toolbar-button";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";
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
import { MediaToolbarButton } from "@/shared/presentation/components/ui/media-toolbar-button";
import { ParagraphSpacingToolbarButton } from "@/shared/presentation/components/ui/paragraph-spacing-toolbar-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { TableToolbarButton } from "@/shared/presentation/components/ui/table-toolbar-button";
import { ToolbarButton, ToolbarGroup } from "@/shared/presentation/components/ui/toolbar";
import { TooltipProvider } from "@/shared/presentation/components/ui/tooltip";
import { TurnIntoToolbarButton } from "@/shared/presentation/components/ui/turn-into-toolbar-button";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { FontFamilyToolbarButton } from "../components/font-family-toolbar-button";
import { PdfPageSectionEditor } from "../components/pdf-page-section-editor";
import { SlashInputElement } from "../components/slash-command/slash-input-element";
import { SlashInputPlugin, SlashPlugin } from "../components/slash-command/slash-plugin";
import {
  createAIElement,
  createConditionalElement,
  createListElement,
  createSwitchElement,
  TEMPLATE_AI_TYPE,
  TEMPLATE_CONDITIONAL_TYPE,
  TEMPLATE_LIST_TYPE,
  TEMPLATE_SWITCH_TYPE,
  TemplateAIElement,
  type TemplateAIElementNode,
  TemplateConditionalElement,
  type TemplateConditionalElementNode,
  TemplateListElement,
  type TemplateListElementNode,
  TemplateLogicBlocksPluginKit,
  TemplateSwitchElement,
  type TemplateSwitchElementNode,
} from "../components/template-logic-blocks";
import { TemplatePreviewPanel } from "../components/template-preview-panel";
import {
  DEFAULT_IMAGE_VARIABLE_HEIGHT_PX,
  DEFAULT_IMAGE_VARIABLE_WIDTH_PERCENT,
  VARIABLE_TYPE,
  VariableElement,
  type VariableElementNode,
  VariablePlugin,
} from "../components/variable-block";
import { VariableSelector } from "../components/variable-selector";
import { TemplateVariableCatalogProvider } from "../contexts/template-variable-catalog-context";
import { useTemplateEditor } from "../hooks/use-template-editor";
import { useTemplatePreview } from "../hooks/use-template-preview";
import { useVariableFields } from "../hooks/use-variable-fields";
import {
  plateValueToTemplateBlocks,
  templateBlocksToPlateValue,
} from "../lib/template-blocks.adapter";
import { getCurrentVariableFormatting } from "../lib/template-editor-formatting";

interface TemplateEditorPageProps {
  templateId: string;
}

export default function TemplateEditorPage({ templateId }: TemplateEditorPageProps) {
  const { template, loading, saveStatus, handleBlocksChange, handlePageConfigChange, updateName } =
    useTemplateEditor(templateId);
  const { collections } = useCollections();
  useGuidancePage({ id: "template-editor" });
  const [isVariableCatalogActive, setIsVariableCatalogActive] = React.useState(false);
  const [isPreviewDataActive, setIsPreviewDataActive] = React.useState(false);

  const { can, isOwner, isSuperAdmin } = usePermissions();
  const {
    records: previewRecords,
    recordsLoading: previewRecordsLoading,
    selectedRecordId,
    setSelectedRecordId,
    loading: previewLoading,
    error: previewError,
    warnings: previewWarnings,
    blocks: previewBlocks,
    generate: generatePreview,
  } = useTemplatePreview({
    templateId,
    collectionId: template?.collectionId,
    accountId: template?.accountId,
    enabled: isPreviewDataActive,
  });

  const [localName, setLocalName] = React.useState(template?.name || "");
  const [isVariableSelectorOpen, setIsVariableSelectorOpen] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [localPageConfig, setLocalPageConfig] = React.useState<PdfPageConfig | null>(
    template?.pageConfig ?? null,
  );
  const variableCatalogDepth = React.useMemo(() => {
    const templateBlocks = template?.blocks ?? [];
    const inferredDepth = analyzeTemplateDependencies(templateBlocks).depth;
    return Math.min(TEMPLATE_PREVIEW_MAX_EAGER_DEPTH, Math.max(2, inferredDepth));
  }, [template?.blocks]);
  const activateVariableCatalog = React.useCallback(() => {
    setIsVariableCatalogActive(true);
    setIsPreviewDataActive(true);
  }, []);
  const handleVariableSelectorOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        activateVariableCatalog();
      }

      setIsVariableSelectorOpen(nextOpen);
    },
    [activateVariableCatalog],
  );
  const handlePreviewOpenChange = React.useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setIsPreviewDataActive(true);
    }

    setIsPreviewOpen(nextOpen);
  }, []);

  const {
    nodes: variableCatalog,
    loading: variableCatalogLoading,
    error: variableCatalogError,
  } = useVariableFields({
    collectionId: template?.collectionId,
    recordId: selectedRecordId || null,
    depth: variableCatalogDepth,
    enabled: isVariableCatalogActive,
  });

  const canEdit = template?.collectionId
    ? can(template.collectionId, "update")
    : isOwner || isSuperAdmin;

  // Update local name when template loads or changes from elsewhere
  React.useEffect(() => {
    if (template?.name && template.name !== localName) {
      setLocalName(template.name);
    }
  }, [template?.name, localName]);

  // Sync pageConfig when the template first loads
  React.useEffect(() => {
    if (template?.pageConfig !== undefined) {
      setLocalPageConfig(template.pageConfig);
    }
    // Only run once on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  // Debounced name update
  React.useEffect(() => {
    if (!template || !canEdit || localName === template.name) return;

    const timeout = setTimeout(() => {
      updateName(localName);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [localName, template, updateName, canEdit]);

  // Listen for slash command variable trigger
  React.useEffect(() => {
    const handleOpenVariableSelector = () => {
      if (canEdit) {
        activateVariableCatalog();
        setIsVariableSelectorOpen(true);
      }
    };

    window.addEventListener("open-variable-selector", handleOpenVariableSelector);
    return () => {
      window.removeEventListener("open-variable-selector", handleOpenVariableSelector);
    };
  }, [activateVariableCatalog, canEdit]);

  const activeCollection = template?.collectionId
    ? (collections.find((col) => col.id === template.collectionId) ?? null)
    : null;

  const collectionName = activeCollection
    ? activeCollection.displayName || activeCollection.name
    : "N/A";

  const collectionContextForAI = React.useMemo(
    () =>
      activeCollection
        ? {
            id: activeCollection.id,
            name: activeCollection.displayName || activeCollection.name,
            description: activeCollection.description,
          }
        : null,
    [activeCollection],
  );

  const primaryFieldName = activeCollection?.primaryFieldName ?? null;

  const templatesBackHref = template?.collectionId
    ? `/collections/${template.collectionId}?tab=templates`
    : "/collections";

  useBreadcrumbs(
    template?.collectionId
      ? [
          { label: "Colecciones", href: "/collections" },
          { label: collectionName, href: templatesBackHref },
          { label: "Plantillas", href: templatesBackHref },
          { label: template?.name || "Cargando..." },
        ]
      : [{ label: "Plantillas", href: "/collections" }, { label: template?.name || "Cargando..." }],
  );

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
      ...TemplateLogicBlocksPluginKit,
      SlashPlugin,
      SlashInputPlugin.withComponent(SlashInputElement),
      BlockSelectionPlugin,
      ...DndKit,
    ],
    override: {
      components: {
        [VARIABLE_TYPE]: VariableElement,
        [TEMPLATE_CONDITIONAL_TYPE]: (props: PlateElementProps<TemplateConditionalElementNode>) => (
          <TemplateConditionalElement {...props} />
        ),
        [TEMPLATE_LIST_TYPE]: (props: PlateElementProps<TemplateListElementNode>) => (
          <TemplateListElement {...props} />
        ),
        [TEMPLATE_SWITCH_TYPE]: (props: PlateElementProps<TemplateSwitchElementNode>) => (
          <TemplateSwitchElement {...props} />
        ),
        [TEMPLATE_AI_TYPE]: (props: PlateElementProps<TemplateAIElementNode>) => (
          <TemplateAIElement {...props} />
        ),
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
          <Link href="/collections">Volver a Colecciones</Link>
        </Button>
      </div>
    );
  }

  return (
    <TemplateVariableCatalogProvider
      value={{
        nodes: variableCatalog,
        loading: variableCatalogLoading,
        error: variableCatalogError,
        collectionContext: collectionContextForAI,
        activate: activateVariableCatalog,
      }}
    >
      <Plate
        editor={editor}
        readOnly={!canEdit}
        onChange={({ value }) => {
          if (canEdit) {
            handleBlocksChange(plateValueToTemplateBlocks(value));
          }
        }}
      >
        <TooltipProvider disableHoverableContent>
          <div className="flex h-dvh flex-col overflow-hidden bg-background">
            {/* Editor Header Bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                  <Link href={templatesBackHref}>
                    <ArrowLeft size={18} />
                  </Link>
                </Button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <input
                      data-guidance-anchor="template-editor-name"
                      className="min-w-[200px] border-none bg-transparent p-0 text-lg font-bold text-foreground outline-none focus:ring-0"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      readOnly={!canEdit}
                    />
                    <span className="flex items-center gap-1.5 rounded border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                      <Database size={10} />
                      {collectionName}
                    </span>
                    {!canEdit && (
                      <span className="flex items-center gap-1.5 rounded border border-foreground/10 bg-foreground/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                        Modo Revisor
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[12px] font-medium transition-all duration-300">
                  {!canEdit ? (
                    <span className="text-foreground/30 font-light flex items-center gap-1.5">
                      No tienes permisos para editar
                    </span>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 border-l border-border/20 pl-4">
                  <Button
                    data-guidance-anchor="template-preview"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2.5 px-4 text-[11px] font-bold uppercase tracking-[0.15em] text-foreground/60 transition-all hover:bg-primary/5 hover:text-primary"
                    onClick={() => {
                      setIsPreviewOpen(true);
                      void generatePreview(plateValueToTemplateBlocks(editor.children));
                    }}
                  >
                    <Eye size={14} className="opacity-70" />
                    Vista Previa
                  </Button>
                </div>
              </div>
            </div>

            {/* Plate Toolbar - Only visible in edit mode */}
            {canEdit && (
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
                      <ParagraphSpacingToolbarButton />
                      <OutdentToolbarButton />
                      <IndentToolbarButton />
                    </ToolbarGroup>

                    <ToolbarGroup>
                      <BulletedListToolbarButton />
                      <NumberedListToolbarButton />
                    </ToolbarGroup>

                    <div data-guidance-anchor="template-logic-blocks">
                      <ToolbarGroup>
                        <ToolbarButton
                          tooltip="Insertar Conditional Block"
                          onMouseDown={(event: React.MouseEvent) => {
                            event.preventDefault();
                            editor.tf.insertNodes([createConditionalElement()]);
                          }}
                        >
                          <GitBranch size={15} />
                        </ToolbarButton>
                        <ToolbarButton
                          tooltip="Insertar List Block"
                          onMouseDown={(event: React.MouseEvent) => {
                            event.preventDefault();
                            editor.tf.insertNodes([createListElement()]);
                          }}
                        >
                          <ListTree size={15} />
                        </ToolbarButton>
                        <ToolbarButton
                          tooltip="Insertar Switch Block"
                          onMouseDown={(event: React.MouseEvent) => {
                            event.preventDefault();
                            editor.tf.insertNodes([createSwitchElement()]);
                          }}
                        >
                          <SquareSplitHorizontal size={15} />
                        </ToolbarButton>
                        <ToolbarButton
                          tooltip="Insertar AI Block"
                          onMouseDown={(event: React.MouseEvent) => {
                            event.preventDefault();
                            editor.tf.insertNodes([createAIElement()]);
                          }}
                        >
                          <BrainCircuit size={15} />
                        </ToolbarButton>
                      </ToolbarGroup>
                    </div>

                    <ToolbarGroup>
                      <LinkToolbarButton />
                      <TableToolbarButton />
                      <MediaToolbarButton nodeType="img" />
                    </ToolbarGroup>

                    <div data-guidance-anchor="template-variable-selector">
                      <ToolbarGroup>
                        <VariableSelector
                          collectionId={template.collectionId || undefined}
                          recordId={selectedRecordId || null}
                          depth={variableCatalogDepth}
                          nodes={variableCatalog}
                          loading={variableCatalogLoading}
                          disabled={!template.collectionId}
                          open={isVariableSelectorOpen}
                          onOpenChange={handleVariableSelectorOpenChange}
                          onSelect={(node) => {
                            const isImageVariable = node.fieldType === "IMAGE";
                            const currentFormatting = getCurrentVariableFormatting(editor);
                            const variableNode: VariableElementNode = {
                              type: VARIABLE_TYPE,
                              fieldPath: node.path,
                              collectionId: node.collectionId,
                              fieldType: node.fieldType,
                              ...currentFormatting,
                              ...(isImageVariable
                                ? {
                                    imageWidthPercent: DEFAULT_IMAGE_VARIABLE_WIDTH_PERCENT,
                                    imageHeightPx: DEFAULT_IMAGE_VARIABLE_HEIGHT_PX,
                                  }
                                : {}),
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
                    </div>
                  </FixedToolbar>
                </div>
              </div>
            )}

            {/* Editor Content — A4 Canvas */}
            <div
              className={cn(
                "flex-1 overflow-y-auto py-10 px-6",
                // subtle dot grid
                "bg-[radial-gradient(circle,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)]",
                "bg-size-[20px_20px]",
                !canEdit && "pt-6",
              )}
            >
              {/* A4 sheet: 794px wide = 210mm @ 96dpi */}
              <div className="mx-auto w-[794px] max-w-full">
                {/* ── HEADER mini-editor ── */}
                <div className="overflow-hidden rounded-t-sm bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]">
                  <PdfPageSectionEditor
                    section="header"
                    value={localPageConfig?.header}
                    readOnly={!canEdit}
                    onChange={(headerSection) => {
                      const next: PdfPageConfig = {
                        ...localPageConfig,
                        header: headerSection,
                      };
                      setLocalPageConfig(next);
                      handlePageConfigChange(next);
                    }}
                  />
                </div>

                {/* ── BODY editor ── */}
                <ResizableProvider>
                  <EditorContainer className="overflow-visible rounded-none border-none bg-transparent shadow-none">
                    <Editor
                      placeholder={canEdit ? "Escribe '/' para ver comandos rápidos..." : ""}
                      variant="a4"
                      className="rounded-none shadow-none border-none"
                    />
                  </EditorContainer>
                </ResizableProvider>

                {/* ── FOOTER mini-editor ── */}
                <div className="overflow-hidden rounded-b-sm bg-white shadow-[0_4px_8px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.05]">
                  <PdfPageSectionEditor
                    section="footer"
                    value={localPageConfig?.footer}
                    readOnly={!canEdit}
                    onChange={(footerSection) => {
                      const next: PdfPageConfig = {
                        ...localPageConfig,
                        footer: footerSection,
                      };
                      setLocalPageConfig(next);
                      handlePageConfigChange(next);
                    }}
                  />
                </div>
              </div>
            </div>

            <Dialog open={isPreviewOpen} onOpenChange={handlePreviewOpenChange}>
              <DialogContent className="flex h-[90vh] w-full max-w-[95vw] flex-col overflow-hidden border-none bg-background p-0 shadow-2xl ring-1 ring-border/5">
                <DialogHeader className="shrink-0 border-b border-border/5 bg-surface/10 px-8 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <DialogTitle className="text-[13px] font-bold uppercase tracking-[0.2em] text-foreground/80">
                        Vista Previa
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        Previsualiza el documento generado con los datos del registro seleccionado.
                      </DialogDescription>

                      <div className="flex items-center gap-3 border-l border-border/10 pl-6">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                          Registro:
                        </span>
                        <Select
                          value={selectedRecordId}
                          onValueChange={setSelectedRecordId}
                          disabled={
                            !template.collectionId || previewRecordsLoading || previewLoading
                          }
                        >
                          <SelectTrigger className="h-8 w-[240px] border-none bg-transparent px-1 text-sm font-medium shadow-none focus:ring-0">
                            <SelectValue placeholder="Selecciona un registro" />
                          </SelectTrigger>
                          <SelectContent>
                            {previewRecords.map((record) => {
                              const primaryValue = primaryFieldName
                                ? toRecordLabelValue(record.data[primaryFieldName])
                                : "";
                              const optionLabel =
                                primaryValue.length > 0
                                  ? primaryValue
                                  : formatShortRecordId(record.id);

                              return (
                                <SelectItem key={record.id} value={record.id}>
                                  {optionLabel}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mr-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="h-8 gap-2 px-4 text-[12px] font-bold transition-all hover:scale-[1.02]"
                        disabled={!template.collectionId || !selectedRecordId || previewLoading}
                        onClick={() => {
                          void generatePreview(plateValueToTemplateBlocks(editor.children));
                        }}
                      >
                        <Sparkles size={14} />
                        {previewLoading ? "Generando..." : "Refrescar"}
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                  <TemplatePreviewPanel
                    blocks={previewBlocks}
                    pageConfig={localPageConfig}
                    error={previewError}
                    loading={previewLoading}
                    warnings={previewWarnings}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </TooltipProvider>
      </Plate>
    </TemplateVariableCatalogProvider>
  );
}
