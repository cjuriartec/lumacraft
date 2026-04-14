"use client";

import { Edit2, Loader2, MoreHorizontal, Plus, Shield, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/components/ui/table";
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import { useRoles } from "../hooks/use-roles";
import { useWorkspace } from "../providers/workspace-provider";

const inputFieldClass = cn(
  "h-11 rounded-xl border-border/10 bg-foreground/5 text-foreground text-sm shadow-none transition-colors px-4",
  "placeholder:font-light focus-visible:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/10",
);

export function RoleManager() {
  const { currentWorkspace } = useWorkspace();
  const { roles, loading, createRole, updateRole, deleteRole } = useRoles(currentWorkspace?.id);
  const { trackMilestone } = useGuidance();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<{
    id: string;
    name: string;
    description: string | null;
  } | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "" });
    setDialogOpen(true);
  };

  const handleOpenEdit = (role: { id: string; name: string; description: string | null }) => {
    setEditingRole({ id: role.id, name: role.name, description: role.description });
    setFormData({ name: role.name, description: role.description || "" });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    let result;

    if (editingRole) {
      result = await updateRole({
        id: editingRole.id,
        name: formData.name,
        description: formData.description,
      });
    } else {
      result = await createRole({ name: formData.name, description: formData.description });
      if (result?.ok) {
        void trackMilestone("role_created");
      }
    }

    setSubmitting(false);
    if (result?.ok) {
      setDialogOpen(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar el rol "${name}"? Esta acción no se puede deshacer.`)) {
      await deleteRole(id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Roles de Usuario</h2>
          <p className="text-sm text-muted-foreground font-light">
            Gestiona los roles personalizados para los miembros del workspace.
          </p>
        </div>
        <Button
          data-guidance-anchor="create-role"
          onClick={handleOpenCreate}
          size="sm"
          className="bg-primary text-background hover:bg-primary/90 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={16} className="mr-2" />
          Crear Rol
        </Button>
      </div>

      <div className="rounded-2xl bg-surface border border-border/5 overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/10 bg-surface-hover/30">
              <TableHead className="w-[200px] text-[11px] font-semibold uppercase tracking-[0.12em] py-4">
                Nombre
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] py-4">
                Descripción
              </TableHead>
              <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-[0.12em] py-4 text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow
                key={role.id}
                className="group hover:bg-surface-hover/30 transition-colors border-b border-border/5 last:border-0"
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{role.name}</span>
                    {role.isSuperadmin && (
                      <Shield size={12} className="text-primary fill-primary/10" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-4 text-xs font-light text-muted-foreground leading-relaxed max-w-md truncate">
                  {role.description || <span className="opacity-30">Sin descripción</span>}
                </TableCell>
                <TableCell className="py-4 text-right">
                  {!role.isSuperadmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Acciones para rol ${role.name}`}
                          className="h-8 w-8 text-muted hover:text-foreground transition-all"
                        >
                          <MoreHorizontal size={14} />
                          <span className="sr-only">Acciones para rol {role.name}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-surface border-border/50">
                        <DropdownMenuItem
                          onClick={() => handleOpenEdit(role)}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 size={14} className="text-muted" />
                          <span>Editar Rol</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border/10" />
                        <DropdownMenuItem
                          onClick={() => handleDelete(role.id, role.name)}
                          className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                          <span>Eliminar Rol</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {role.isSuperadmin && (
                    <div className="flex items-center justify-end pr-3 text-muted-foreground/30">
                      <Shield size={14} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {roles.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-32 text-center text-muted-foreground font-light text-sm italic"
                >
                  No hay roles personalizados configurados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px] rounded-2xl border-none bg-surface shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
          <DialogHeader className="shrink-0 px-8 pt-8 pb-4 text-left">
            <DialogTitle className="text-xl font-bold tracking-[-0.01em] text-foreground">
              {editingRole ? "Editar Rol" : "Nuevo Rol"}
            </DialogTitle>
            <DialogDescription className="font-light text-sm text-foreground/70">
              {editingRole
                ? "Modifica el nombre y descripción del rol."
                : "Configura un nuevo rol para tu workspace."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="px-8 py-4 space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="role-name"
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70 ml-1"
                >
                  Nombre del Rol
                </Label>
                <Input
                  id="role-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej. Editor de Contenido"
                  required
                  className={inputFieldClass}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="role-description"
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70 ml-1"
                >
                  Descripción
                </Label>
                <Textarea
                  id="role-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe las responsabilidades de este rol..."
                  rows={4}
                  className={cn(inputFieldClass, "min-h-[120px] py-4")}
                />
              </div>
            </div>

            <div className="shrink-0 px-8 py-6 bg-transparent">
              <DialogFooter className="flex-col gap-3 sm:flex-row sm:justify-end sm:gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                  className="rounded-xl font-semibold text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary font-semibold text-primary-foreground rounded-xl shadow-sm transition-all hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 sm:w-auto sm:min-w-[140px]"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingRole ? (
                    "Guardar Cambios"
                  ) : (
                    "Crear Rol"
                  )}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
