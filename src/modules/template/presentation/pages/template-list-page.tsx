"use client";

import {
  Clock,
  ExternalLink,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import {
  buildCollectionIdSet,
  filterAccessibleCollections,
  filterTemplatesByAccessibleCollections,
} from "@/shared/lib/workspace-access";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import { Input } from "@/shared/presentation/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import type { Template } from "../../domain/entities/template.entity";
import { TemplateCreateDialog } from "../components/template-create-dialog";
import { useTemplates } from "../hooks/use-templates";

interface TemplateListPageProps {
  collectionId?: string;
  collectionName?: string;
  embedded?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  enableCollectionFilter?: boolean;
  showCollectionShortcut?: boolean;
}

export default function TemplateListPage({
  collectionId,
  collectionName,
  embedded = false,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  enableCollectionFilter = false,
  showCollectionShortcut = false,
}: TemplateListPageProps) {
  useBreadcrumbs(embedded ? [] : [{ label: "Plantillas" }]);

  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, refresh } =
    useTemplates();
  const { collections } = useCollections();
  const { can, isOwner, isSuperAdmin, loading: permissionsLoading } = usePermissions();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedCollectionId, setSelectedCollectionId] = React.useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);

  const accessibleCollections = React.useMemo(
    () => filterAccessibleCollections(collections, isOwner || isSuperAdmin, can),
    [can, collections, isOwner, isSuperAdmin],
  );
  const accessibleCollectionIds = React.useMemo(
    () => buildCollectionIdSet(accessibleCollections),
    [accessibleCollections],
  );
  const accessibleTemplates = React.useMemo(
    () => filterTemplatesByAccessibleCollections(templates, accessibleCollectionIds),
    [accessibleCollectionIds, templates],
  );

  const scopedTemplates = React.useMemo(() => {
    if (collectionId) {
      return accessibleTemplates.filter((template) => template.collectionId === collectionId);
    }

    if (selectedCollectionId !== "all") {
      return accessibleTemplates.filter(
        (template) => template.collectionId === selectedCollectionId,
      );
    }

    return accessibleTemplates;
  }, [accessibleTemplates, collectionId, selectedCollectionId]);

  const filteredTemplates = scopedTemplates.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getCollectionName = (id?: string | null) => {
    if (!id) return "N/A";
    const c = collections.find((col) => col.id === id);
    return c ? c.displayName || c.name : "Colección";
  };

  const handleEdit = (template: Template) => {
    if (!canUpdate) return;
    setEditingTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) setEditingTemplate(null);
  };

  const currentCollectionName =
    collectionName || (collectionId ? getCollectionName(collectionId) : undefined);

  const wrapperClassName = embedded ? "space-y-8" : "p-8 max-w-5xl mx-auto";
  const showLoading = loading || permissionsLoading;
  const emptyStateDescription =
    !canCreate && accessibleTemplates.length === 0
      ? "No tienes plantillas accesibles en las colecciones visibles actualmente."
      : canCreate
        ? "No se encontraron plantillas. Comienza creando una nueva."
        : "No se encontraron plantillas con los filtros actuales.";

  React.useEffect(() => {
    if (
      selectedCollectionId !== "all" &&
      !accessibleCollections.some((item) => item.id === selectedCollectionId)
    ) {
      setSelectedCollectionId("all");
    }
  }, [accessibleCollections, selectedCollectionId]);

  return (
    <div className={wrapperClassName}>
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-10">
        <div data-guidance-anchor="template-search" className="relative flex-1 w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            size={18}
          />
          <Input
            placeholder="Buscar por nombre..."
            className="pl-10 h-11 bg-surface border-border/50 rounded-xl focus:ring-1 focus:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {!embedded && enableCollectionFilter && (
          <div className="w-full md:w-[240px]">
            <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
              <SelectTrigger className="h-11 rounded-xl border-border/40 bg-surface">
                <SelectValue placeholder="Filtrar por colección" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border/50">
                <SelectItem value="all">Todas las colecciones</SelectItem>
                {accessibleCollections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.displayName || collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface/50 rounded-xl border border-border/30 text-[13px] text-foreground/60 h-11">
            <FileText size={14} className="text-primary/70" />
            <b className="text-foreground">{scopedTemplates.length}</b>
          </div>
          {canCreate && (
            <Button
              data-guidance-anchor="new-template"
              onClick={() => {
                setEditingTemplate(null);
                setCreateDialogOpen(true);
              }}
              className="flex-1 md:flex-none gap-2 h-11 px-6 rounded-xl font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus size={18} />
              Nueva Plantilla
            </Button>
          )}
        </div>
      </div>

      {/* Template List */}
      <div
        data-guidance-anchor="template-list-table"
        className="bg-surface rounded-2xl border border-border/10 overflow-hidden shadow-sm"
      >
        {showLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
            <p className="text-muted text-xs font-light">Cargando plantillas...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-primary/10">
              <FileText size={28} className="text-primary/50" />
            </div>
            <h3 className="text-lg font-bold mb-1 text-foreground">Sin plantillas</h3>
            <p className="text-sm font-light max-w-[280px] mb-6 text-foreground/50">
              {emptyStateDescription}
            </p>
            {canCreate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTemplate(null);
                  setCreateDialogOpen(true);
                }}
                className="rounded-xl border-border/40"
              >
                Crear Plantilla
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/10">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-foreground/40">
                    Nombre
                  </th>
                  {!embedded && (
                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-foreground/40">
                      Colección
                    </th>
                  )}
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-foreground/40">
                    Última Modificación
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-bold uppercase tracking-widest text-foreground/40">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr
                    key={template.id}
                    className="group border-b border-border/5 hover:bg-surface-hover/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary/60 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {template.name}
                          </p>
                          <p className="text-[12px] font-light text-foreground/50 truncate max-w-[200px]">
                            {template.description || "Sin descripción"}
                          </p>
                        </div>
                      </div>
                    </td>
                    {!embedded && (
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                          {getCollectionName(template.collectionId)}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[12px] text-foreground/60">
                        <Clock size={12} className="opacity-50" />
                        <span>
                          {new Date(template.updatedAt).toLocaleDateString("es", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Acciones para ${template.name}`}
                            className="h-8 w-8 text-muted hover:text-foreground transition-all"
                          >
                            <MoreHorizontal size={14} />
                            <span className="sr-only">Acciones para {template.name}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-surface border-border/50"
                        >
                          <DropdownMenuItem asChild>
                            <Link
                              href={
                                template.collectionId
                                  ? `/collections/${template.collectionId}/templates/${template.id}`
                                  : `/templates/${template.id}`
                              }
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <ExternalLink size={14} className="text-muted" />
                              <span>Abrir Editor</span>
                            </Link>
                          </DropdownMenuItem>

                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => handleEdit(template)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Settings2 size={14} className="text-muted" />
                              <span>Configuración</span>
                            </DropdownMenuItem>
                          )}

                          {showCollectionShortcut && template.collectionId && (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/collections/${template.collectionId}`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <ExternalLink size={14} className="text-muted" />
                                <span>Abrir Colección</span>
                              </Link>
                            </DropdownMenuItem>
                          )}

                          {canDelete && (
                            <>
                              <DropdownMenuSeparator className="bg-border/10" />
                              <DropdownMenuItem
                                onClick={() => deleteTemplate(template.id)}
                                className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                              >
                                <Trash2 size={14} />
                                <span>Eliminar</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TemplateCreateDialog
        open={createDialogOpen}
        onOpenChange={handleOpenChange}
        templateToEdit={editingTemplate}
        forcedCollectionId={collectionId}
        forcedCollectionLabel={currentCollectionName}
        onSuccess={refresh}
        onCreateTemplate={createTemplate}
        onUpdateTemplate={updateTemplate}
      />
    </div>
  );
}
