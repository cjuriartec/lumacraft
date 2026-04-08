"use client";

import { Download, File, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useTemplates } from "@/modules/template/presentation/hooks/use-templates";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";

interface ExportRecordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  recordId: string | null;
}

export function ExportRecordModal({
  isOpen,
  onOpenChange,
  collectionId,
  recordId,
}: ExportRecordModalProps) {
  const { templates, loading: templatesLoading } = useTemplates();
  const collectionTemplates = templates.filter((t) => t.collectionId === collectionId);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [format, setFormat] = useState<"pdf" | "docx">("pdf");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!recordId || !selectedTemplateId) return;

    setExporting(true);
    try {
      const response = await fetch(`/api/collections/${collectionId}/records/${recordId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          format,
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error?.message || "Error al exportar");
      }

      if (json.data?.url) {
        window.open(json.data.url, "_blank");
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error desconocido al procesar el archivo");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={18} />
            Exportar documento
          </DialogTitle>
          <DialogDescription>
            Selecciona una plantilla para rellenar con los datos del registro y descarga el PDF o
            DOCX.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Plantilla</label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={templatesLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={templatesLoading ? "Cargando..." : "Elige una plantilla"}
                />
              </SelectTrigger>
              <SelectContent>
                {collectionTemplates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {collectionTemplates.length === 0 && !templatesLoading && (
              <p className="text-xs text-muted-foreground">
                No tienes plantillas para esta colección.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Formato</label>
            <Select value={format} onValueChange={(val: "pdf" | "docx") => setFormat(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">Documento PDF (.pdf)</SelectItem>
                <SelectItem value="docx">Microsoft Word (.docx)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedTemplateId || exporting || collectionTemplates.length === 0}
            className="w-32"
          >
            {exporting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <>
                <File size={16} className="mr-2" />
                Descargar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
