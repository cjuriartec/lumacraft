"use client";

import { Eye, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useTemplates } from "@/modules/template/presentation/hooks/use-templates";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";

interface RecordDocumentSelectorModalProps {
  collectionId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recordId: string | null;
}

export function RecordDocumentSelectorModal({
  collectionId,
  isOpen,
  onOpenChange,
  recordId,
}: RecordDocumentSelectorModalProps) {
  const router = useRouter();
  const { templates, loading } = useTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const collectionTemplates = useMemo(
    () => templates.filter((template) => template.collectionId === collectionId),
    [collectionId, templates],
  );

  useEffect(() => {
    if (!isOpen) {
      const tmr = setTimeout(() => setSelectedTemplateId(""), 0);
      return () => clearTimeout(tmr);
    }

    if (collectionTemplates.length === 1) {
      const ts = setTimeout(() => setSelectedTemplateId(collectionTemplates[0].id), 0);
      return () => clearTimeout(ts);
    }
  }, [collectionTemplates, isOpen]);

  const handleOpenDocument = () => {
    if (!recordId || !selectedTemplateId) return;

    router.push(`/collections/${collectionId}/records/${recordId}/documents/${selectedTemplateId}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] border-border/50 bg-background p-0 overflow-hidden">
        <div className="p-8 space-y-8">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-[1.5rem] tracking-[-0.01em] font-semibold">
              Abrir Documento
            </DialogTitle>
            <DialogDescription className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-50">
              Documento persistido por plantilla
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Plantilla
            </label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={loading}
            >
              <SelectTrigger className="h-10 bg-surface border-border/40 font-medium transition-all hover:bg-surface-hover/50">
                <SelectValue placeholder={loading ? "Cargando..." : "Elige una plantilla"} />
              </SelectTrigger>
              <SelectContent>
                {collectionTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {collectionTemplates.length === 0 && !loading && (
            <div className="rounded-xl border border-border/40 bg-surface/50 px-4 py-4 text-sm text-muted-foreground">
              Esta colección todavía no tiene plantillas disponibles.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-10 border-border/40 hover:bg-surface rounded-lg text-[11px] font-bold uppercase tracking-[0.12em]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenDocument}
              disabled={!selectedTemplateId || !recordId}
              className="h-10 gap-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-[11px] font-bold uppercase tracking-[0.12em]"
            >
              <Eye size={14} />
              Abrir
            </Button>
          </div>

          <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-[12px] text-primary/80 flex items-center gap-3">
            <FileText size={14} className="shrink-0" />
            La primera vez se compila el documento. Luego se abrirá siempre la versión guardada.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
