"use client";

import { BrainCircuit, Database, FileText } from "lucide-react";

import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { RenameWorkspaceDialog } from "../components/rename-workspace-dialog";
import { useWorkspaceAccess } from "../hooks/use-workspace-access";
import { useWorkspaceStats } from "../hooks/use-workspace-stats";
import { useWorkspace } from "../providers/workspace-provider";

export default function WorkspaceGeneralPage() {
  const { currentWorkspace } = useWorkspace();
  const { stats, loading: loadingStats } = useWorkspaceStats();
  const { canRenameWorkspace } = useWorkspaceAccess();

  useBreadcrumbs([
    { label: "Configuración", href: "/settings" },
    { label: "Workspace", href: "/settings/workspace/general" },
    { label: "General" },
  ]);

  if (!currentWorkspace) {
    return (
      <div className="rounded-2xl border border-dashed border-border/30 bg-surface/60 p-10 text-center text-sm text-foreground/65">
        No hay un workspace activo seleccionado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Identity & Actions */}
      <div className="rounded-3xl border border-border/50 bg-surface p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
              Identidad
            </p>
            <p className="max-w-xl text-sm leading-6 text-foreground/70">
              Personaliza el nombre y la identidad que verán todos los miembros del equipo.
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            {canRenameWorkspace && <RenameWorkspaceDialog workspace={currentWorkspace} />}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Colecciones", value: stats.collectionsCount, icon: Database },
          { label: "Registros", value: stats.recordsCount, icon: FileText },
          { label: "Plantillas", value: stats.templatesCount, icon: BrainCircuit },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="group rounded-3xl border border-border/40 bg-surface p-6 transition-all hover:border-primary/20"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground/50">{item.label}</p>
                <div className="rounded-xl bg-primary/5 p-2 text-primary/70 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon size={16} />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold tracking-[-0.03em] text-foreground">
                {loadingStats ? (
                  <span className="inline-block h-8 w-12 animate-pulse rounded-lg bg-foreground/5" />
                ) : (
                  item.value
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
