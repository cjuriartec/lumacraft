"use client";

import { Clock, ExternalLink, FileText, Plus, Search, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
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
}

export default function TemplateListPage({
  collectionId,
  collectionName,
  embedded = false,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
}: TemplateListPageProps) {
  useBreadcrumbs(embedded ? [] : [{ label: "Plantillas" }]);

  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, refresh } =
    useTemplates();
  const { collections } = useCollections();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);

  const scopedTemplates = collectionId
    ? templates.filter((template) => template.collectionId === collectionId)
    : templates;

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

  return (
    <div className={wrapperClassName}>
      {/* Search & Actions */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-10">
        <div className="relative flex-1 w-full">
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
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface/50 rounded-xl border border-border/30 text-[13px] text-foreground/60 h-11">
            <FileText size={14} className="text-primary/70" />
            <b className="text-foreground">{scopedTemplates.length}</b>
          </div>
          {canCreate && (
            <Button
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
      <div className="bg-surface rounded-2xl border border-border/10 overflow-hidden shadow-sm">
        {loading ? (
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
              No se encontraron plantillas. Comienza creando una nueva.
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
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={
                            template.collectionId
                              ? `/collections/${template.collectionId}/templates/${template.id}`
                              : `/templates/${template.id}`
                          }
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-foreground/60 hover:text-primary hover:bg-primary/10"
                          title="Abrir Editor"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        {canUpdate && (
                          <button
                            onClick={() => handleEdit(template)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-foreground/60 hover:text-primary hover:bg-primary/10"
                            title="Configuración"
                          >
                            <Settings2 size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-foreground/60 hover:text-red-400 hover:bg-red-400/10"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
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
