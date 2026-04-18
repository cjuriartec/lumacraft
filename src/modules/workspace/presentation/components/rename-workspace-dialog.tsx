"use client";

import { Loader2, PencilLine } from "lucide-react";
import { useState } from "react";

import { Workspace } from "@/modules/workspace/domain/entities/workspace.entity";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/presentation/components/ui/dialog";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";

import { useWorkspace } from "../providers/workspace-provider";

interface RenameWorkspaceDialogProps {
  workspace: Workspace;
  children?: React.ReactNode;
}

export function RenameWorkspaceDialog({ workspace, children }: RenameWorkspaceDialogProps) {
  const { renameWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await renameWorkspace(workspace.id, name.trim());
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setName(workspace.name);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" className="rounded-xl">
            <PencilLine size={14} className="mr-2" />
            Renombrar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-2xl border-border/40 bg-surface sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Renombrar workspace</DialogTitle>
          <DialogDescription>
            Este cambio será visible para todos los miembros del espacio de trabajo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workspace-rename">Nombre</Label>
            <Input
              id="workspace-rename"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Nombre del workspace"
              required
              className="h-11 rounded-xl border-border/20 bg-background/50"
            />
            {error ? <p className="text-xs text-red-500">{error}</p> : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting || !name.trim() || name.trim() === workspace.name}
              className="bg-primary text-background hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar nombre"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
