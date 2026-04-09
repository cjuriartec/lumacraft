"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import { Tabs, TabsList, TabsTrigger } from "@/shared/presentation/components/ui/tabs";

interface ExportRecordModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  recordId: string | null;
}

type ExportStep = "idle" | "processing" | "completed";

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
  const [step, setStep] = useState<ExportStep>("idle");
  const [progress, setProgress] = useState(0);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep("idle");
        setProgress(0);
      }, 300);
    }
  }, [isOpen]);

  const handleExport = async () => {
    if (!recordId || !selectedTemplateId) return;

    setStep("processing");
    setProgress(5);

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 8;
        });
      }, 800);

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
      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(json.error?.message || "Error al exportar");
      }

      setProgress(100);
      setTimeout(() => {
        setStep("completed");
        if (json.data?.url) {
          window.open(json.data.url, "_blank");
        }
      }, 800);
    } catch (e) {
      setStep("idle");
      toast.error(e instanceof Error ? e.message : "Error desconocido al procesar el archivo");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (step === "processing" && !open) return;
        onOpenChange(open);
      }}
    >
      <DialogContent
        onPointerDownOutside={(e) => step === "processing" && e.preventDefault()}
        onEscapeKeyDown={(e) => step === "processing" && e.preventDefault()}
        className="sm:max-w-[400px] border-border/50 bg-background transition-all duration-300 p-0 overflow-hidden outline-none"
      >
        <AnimatePresence mode="wait">
          {step === "idle" && (
            <motion.div
              key="selection"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 space-y-8"
            >
              <DialogHeader>
                <div className="space-y-1">
                  <DialogTitle className="text-[1.5rem] tracking-[-0.01em] font-semibold">
                    Exportar Registro
                  </DialogTitle>
                  <DialogDescription className="text-[11px] font-medium uppercase tracking-[0.12em] opacity-50">
                    Engineered document output
                  </DialogDescription>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Plantilla
                  </label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                    disabled={templatesLoading}
                  >
                    <SelectTrigger className="h-10 bg-surface border-border/40 font-medium transition-all hover:bg-surface-hover/50">
                      <SelectValue
                        placeholder={templatesLoading ? "Cargando..." : "Elige una opción"}
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
                </div>

                <div className="space-y-3">
                  <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Formato
                  </label>
                  <Tabs
                    value={format}
                    onValueChange={(val) => setFormat(val as "pdf" | "docx")}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2 h-10 bg-surface/50 border border-border/30 p-1 rounded-lg">
                      <TabsTrigger
                        value="pdf"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-border/40 text-[11px] font-semibold uppercase tracking-wider transition-all"
                      >
                        Portable PDF
                      </TabsTrigger>
                      <TabsTrigger
                        value="docx"
                        className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-border/40 text-[11px] font-semibold uppercase tracking-wider transition-all"
                      >
                        Microsoft Word
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-10 border-border/40 hover:bg-surface rounded-lg text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleExport}
                  disabled={!selectedTemplateId || templatesLoading}
                  className="flex-2 h-10 bg-primary hover:bg-primary/95 text-white rounded-lg text-[11px] font-bold uppercase tracking-[0.12em]"
                >
                  Generar
                </Button>
              </div>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-16 flex flex-col items-center space-y-10"
            >
              <div className="relative">
                <div className="h-16 w-16 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="transparent"
                      className="text-muted/20"
                    />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="30"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="transparent"
                      strokeDasharray="188.4"
                      animate={{ strokeDashoffset: 188.4 - (188.4 * progress) / 100 }}
                      className="text-primary stroke-round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles size={20} className="text-primary/70 animate-pulse" />
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground transition-all">
                  Construyendo Documento
                </p>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground opacity-60">
                  La IA está ensamblando las piezas
                </p>
              </div>
            </motion.div>
          )}

          {step === "completed" && (
            <motion.div
              key="completed"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-16 flex flex-col items-center space-y-8"
            >
              <div className="h-14 w-14 rounded-full bg-surface border border-border/40 text-foreground flex items-center justify-center transition-all shadow-sm">
                <CheckCircle2 size={24} className="text-primary/80" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-semibold tracking-tight">Exportación Finalizada</h3>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-primary/70 mb-4">
                  Archivo Descargado
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
