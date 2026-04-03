"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useCollections } from "@/modules/collection/presentation/hooks/use-collections";
import type { Result } from "@/shared/domain/result";
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

import type { Template } from "../../domain/entities/template.entity";

interface CreateTemplateParams {
  name: string;
  description?: string;
  collectionId?: string | null;
}

interface UpdateTemplateParams extends CreateTemplateParams {
  id: string;
}

interface TemplateCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateToEdit?: Template | null;
  onSuccess?: () => void;
  onCreateTemplate: (params: CreateTemplateParams) => Promise<Result<Template>>;
  onUpdateTemplate: (params: UpdateTemplateParams) => Promise<Result<Template>>;
}

export function TemplateCreateDialog({
  open,
  onOpenChange,
  templateToEdit,
  onSuccess,
  onCreateTemplate,
  onUpdateTemplate,
}: TemplateCreateDialogProps) {
  const router = useRouter();
  const { collections, loading: collectionsLoading } = useCollections();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [collectionId, setCollectionId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);

  const isEditing = !!templateToEdit;

  React.useEffect(() => {
    if (templateToEdit && open) {
      setName(templateToEdit.name);
      setDescription(templateToEdit.description || "");
      setCollectionId(templateToEdit.collectionId || "");
    } else if (!templateToEdit && open) {
      setName("");
      setDescription("");
      setCollectionId("");
    }
  }, [templateToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || (!isEditing && !collectionId)) return;

    setLoading(true);

    if (isEditing) {
      const res = await onUpdateTemplate({
        id: templateToEdit.id,
        name,
        description,
        collectionId,
      });
      setLoading(false);
      if (res?.ok) {
        onOpenChange(false);
        onSuccess?.();
      }
    } else {
      const res = await onCreateTemplate({
        name,
        description,
        collectionId,
      });
      setLoading(false);
      if (res?.ok) {
        onOpenChange(false);
        router.push(`/templates/${res.value.id}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-popover border-border/50">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Template" : "Nuevo Template"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Modifica la información básica del documento."
                : "Crea una nueva plantilla de documento vinculada a una colección."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-6">
            <div className="grid gap-2">
              <Label
                htmlFor="name"
                className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
              >
                Nombre del documento
              </Label>
              <Input
                id="name"
                placeholder="Ej. Factura de Venta"
                className="h-11 bg-surface border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="description"
                className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
              >
                Descripción
              </Label>
              <Textarea
                id="description"
                placeholder="Breve descripción del template..."
                className="bg-surface border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all resize-none font-light"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            {!isEditing && (
              <div className="grid gap-2">
                <Label
                  htmlFor="collection"
                  className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1"
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
                  <SelectContent className="bg-popover border-border/50 rounded-xl">
                    {collections.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        className="focus:bg-accent cursor-pointer rounded-lg"
                      >
                        {c.displayName || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isEditing && (
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70">
                  VINCULADO A:{" "}
                  {collections.find((c) => c.id === collectionId)?.displayName || "N/A"}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl border-border/40"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !name || (!isEditing && !collectionId)}
              className="rounded-xl font-bold bg-primary hover:bg-primary-hover shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear y Abrir Editor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
