"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

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

interface CreateWorkspaceDialogProps {
  children?: React.ReactNode;
  onCreated?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateWorkspaceDialog({
  children,
  onCreated,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: CreateWorkspaceDialogProps) {
  const { createWorkspace } = useWorkspace();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const open = openProp ?? uncontrolledOpen;

  const setOpen = (nextOpen: boolean) => {
    onOpenChangeProp?.(nextOpen);
    if (openProp === undefined) {
      setUncontrolledOpen(nextOpen);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createWorkspace(name.trim());

    setSubmitting(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setName("");
    setOpen(false);
    onCreated?.();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName("");
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button size="sm" className="bg-primary text-background hover:bg-primary/90">
            <Plus size={16} className="mr-2" />
            Nuevo workspace
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="rounded-2xl border-border/40 bg-surface sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Nuevo workspace</DialogTitle>
          <DialogDescription>
            Crea un nuevo espacio de trabajo para separar datos, equipo y configuración.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Nombre</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
              placeholder="Ej. Operaciones"
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
              disabled={submitting || !name.trim()}
              className="bg-primary text-background hover:bg-primary/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
