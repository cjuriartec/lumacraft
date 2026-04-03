"use client";

import { Clock, ExternalLink, FileText, Plus, Search, Settings2, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { Template } from "../../domain/entities/template.entity";
import { TemplateCreateDialog } from "../components/template-create-dialog";
import { useTemplates } from "../hooks/use-templates";

export default function TemplateListPage() {
  useBreadcrumbs([{ label: "Documentos" }]);
  const { templates, loading, deleteTemplate, refresh } = useTemplates();
  const { collections } = useCollections();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getCollectionName = (id?: string | null) => {
    if (!id) return "N/A";
    const c = collections.find((col) => col.id === id);
    return c ? c.displayName || c.name : "Colección";
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) setEditingTemplate(null);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] bg-primary/10 px-2 py-0.5 rounded-md text-primary/70">
              Template Engine
            </span>
          </div>
          <h1 className="text-[2.5rem] font-bold leading-tight mb-2 text-foreground tracking-[-0.02em]">
            Documentos
          </h1>
          <p className="text-base font-light text-foreground/70">
            Diseña y gestiona plantillas inteligentes para generar documentos.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setCreateDialogOpen(true);
          }}
          className="gap-2 h-11 px-6 rounded-xl font-semibold shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={18} />
          Nuevo Template
        </Button>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
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
        <div className="flex items-center gap-6 px-4 py-2 bg-surface/50 rounded-xl border border-border/30 text-sm text-foreground/60">
          <span className="flex items-center gap-2">
            <FileText size={14} className="text-primary/70" />
            <b className="text-foreground">{templates.length}</b> Plantillas
          </span>
        </div>
      </div>

      {/* Template Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-xl bg-surface animate-pulse border border-border/50"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl text-center bg-surface">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-primary/10">
            <FileText size={28} className="text-primary/50" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground tracking-[-0.01em]">
            Sin documentos todavía
          </h3>
          <p className="text-sm font-light max-w-sm mb-8 text-foreground/70 leading-[1.7]">
            Crea tu primer template para comenzar a diseñar documentos dinámicos basados en tus
            datos.
          </p>
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setCreateDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus size={18} />
            Crear Plantilla
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              collectionName={getCollectionName(template.collectionId)}
              onDelete={() => deleteTemplate(template.id)}
              onEdit={() => handleEdit(template)}
            />
          ))}

          {/* Add new card */}
          <div
            onClick={() => {
              setEditingTemplate(null);
              setCreateDialogOpen(true);
            }}
            className="rounded-xl p-5 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 min-h-[180px] bg-transparent hover:bg-surface/50 dark:hover:bg-surface-hover/30 border border-dashed border-border/60"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary/50">
              <Plus size={18} />
            </div>
            <p className="text-[13px] font-light text-foreground/60">Nuevo documento</p>
          </div>
        </div>
      )}

      <TemplateCreateDialog
        open={createDialogOpen}
        onOpenChange={handleOpenChange}
        templateToEdit={editingTemplate}
        onSuccess={refresh}
      />
    </div>
  );
}

function TemplateCard({
  template,
  collectionName,
  onDelete,
  onEdit,
}: {
  template: Template;
  collectionName: string;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="group rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 bg-surface dark:bg-surface-hover dark:ring-1 dark:ring-white/5 border border-border/50">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105 bg-primary/10 text-primary/70">
          <FileText size={18} />
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            aria-label={`Eliminar template ${template.name}`}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 text-foreground/60 hover:text-red-400 hover:bg-red-400/10"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
          >
            <Trash2 size={14} />
          </button>
          <button
            aria-label={`Configurar template ${template.name}`}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-150 text-foreground/60 hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.preventDefault();
              onEdit();
            }}
          >
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="text-[14px] font-semibold mb-1 transition-colors duration-150 group-hover:text-primary text-foreground truncate">
        {template.name}
      </h3>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
          {collectionName}
        </span>
      </div>

      <p className="text-[13px] font-light line-clamp-2 mb-5 leading-relaxed text-foreground/70 min-h-[2.6rem]">
        {template.description || "Sin descripción."}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground/60 uppercase tracking-[0.05em]">
          <Clock size={11} />
          <span>
            {new Date(template.updatedAt).toLocaleDateString("es", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
        <Link
          href={`/templates/${template.id}`}
          className="flex items-center gap-1 text-[12px] font-bold transition-all duration-150 group/btn text-primary hover:gap-1.5"
        >
          Editar
          <ExternalLink
            size={12}
            className="opacity-70 group-hover/btn:opacity-100 transition-opacity"
          />
        </Link>
      </div>
    </div>
  );
}
