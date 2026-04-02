"use client";

import { Clock, ExternalLink, FileText, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import { Input } from "@/shared/presentation/components/ui/input";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { Template } from "../../domain/entities/template.entity";
import { TemplateCreateDialog } from "../components/template-create-dialog";
import { useTemplates } from "../hooks/use-templates";

export default function TemplateListPage() {
  useBreadcrumbs([{ label: "Documentos" }]);
  const { templates, loading, deleteTemplate } = useTemplates();
  const { collections } = useCollections();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getCollectionName = (id?: string | null) => {
    if (!id) return "N/A";
    const c = collections.find((col) => col.id === id);
    return c ? c.displayName || c.name : "Colección";
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-primary bg-primary/10 px-2 py-0.5 rounded-md">
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
          onClick={() => setCreateDialogOpen(true)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-surface animate-pulse border border-border/50"
            />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface/30 rounded-3xl border border-dashed border-border/60">
          <FileText size={48} className="text-muted-foreground/20 mb-4" />
          <p className="text-foreground/60 font-medium">No se encontraron plantillas</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Crea tu primer documento para empezar.
          </p>
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            Crear Plantilla
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              collectionName={getCollectionName(template.collectionId)}
              onDelete={() => deleteTemplate(template.id)}
            />
          ))}
        </div>
      )}

      <TemplateCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}

function TemplateCard({
  template,
  collectionName,
  onDelete,
}: {
  template: Template;
  collectionName: string;
  onDelete: () => void;
}) {
  return (
    <div className="group relative bg-surface border border-border/50 rounded-2xl p-5 hover:bg-surface-hover/30 hover:-translate-y-0.5 transition-all duration-200 dark:ring-1 dark:ring-white/5">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <FileText size={20} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <Link href={`/templates/${template.id}`}>
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <ExternalLink size={14} /> Editar
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive cursor-pointer"
              onClick={onDelete}
            >
              <Trash2 size={14} /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/templates/${template.id}`} className="block select-none">
        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
          {template.name}
        </h3>
        <p className="text-xs text-muted-foreground/70 mb-4 line-clamp-2 min-h-8">
          {template.description || "Sin descripción"}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border/30 mt-auto">
          <span className="text-[10px] uppercase tracking-wider font-bold text-foreground/50 bg-foreground/5 px-2 py-0.5 rounded">
            {collectionName}
          </span>
          <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
            <Clock size={10} />
            {new Date(template.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </Link>
    </div>
  );
}
