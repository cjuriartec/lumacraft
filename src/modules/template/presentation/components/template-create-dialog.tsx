"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";
import { Input } from "@/shared/presentation/components/ui/input";
import { Label } from "@/shared/presentation/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import { useTemplates } from "../hooks/use-templates";

interface TemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateCreateDialog({ open, onOpenChange }: TemplateCreateDialogProps) {
  const router = useRouter();
  const { collections, loading: collectionsLoading } = useCollections();
  const { createTemplate } = useTemplates();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [collectionId, setCollectionId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !collectionId) return;

    setLoading(true);
    const res = await createTemplate({
      name,
      description,
      collectionId,
    });
    setLoading(false);

    if (res?.ok) {
      onOpenChange(false);
      router.push(`/templates/${res.value.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Nuevo Template</DialogTitle>
            <DialogDescription>
              Crea una nueva plantilla de documento vinculada a una colección.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1"
              >
                Nombre del documento
              </Label>
              <Input
                id="name"
                placeholder="Ej. Factura de Venta"
                className="h-11 bg-surface border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="description"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1"
              >
                Descripción
              </Label>
              <Textarea
                id="description"
                placeholder="Breve descripción del template..."
                className="bg-surface border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="collection"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1"
              >
                Colección Vinculada
              </Label>
              <Select value={collectionId} onValueChange={setCollectionId} required>
                <SelectTrigger
                  id="collection"
                  className="h-11 bg-surface border-border/40 rounded-xl focus:ring-primary/20 transition-all"
                >
                  <SelectValue
                    placeholder={collectionsLoading ? "Cargando..." : "Selecciona una colección"}
                  />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border/50 rounded-xl">
                  {collections.map((c) => (
                    <SelectItem
                      key={c.id}
                      value={c.id}
                      className="focus:bg-surface-hover cursor-pointer"
                    >
                      {c.displayName || c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !name || !collectionId}>
              {loading ? "Creando..." : "Crear y Abrir Editor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
