"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Plus, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Result } from "@/shared/domain/result";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/presentation/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { Switch } from "@/shared/presentation/components/ui/switch";
import { TagInput } from "@/shared/presentation/components/ui/tag-input";
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import { Field } from "../../domain/entities/field.entity";
import { useMimeTypes } from "../hooks/use-mime-types";

const inputFieldClass = cn(
  "h-10 rounded-lg border-border bg-foreground/5 text-foreground text-sm shadow-none transition-colors",
  "placeholder:font-light focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20",
);

const selectTriggerClass = cn(
  "h-10 rounded-lg border-border bg-foreground/5 text-foreground text-sm shadow-none transition-colors",
  "focus:ring-2 focus:ring-primary/20",
);

function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("pt-2", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/70 mb-4">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-foreground/2 px-4 py-3 transition-colors hover:bg-foreground/5">
      <Label htmlFor={id} className="cursor-pointer text-[12px] font-medium text-foreground/80">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="shrink-0" />
    </div>
  );
}

const fieldSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guiones bajos"),
  displayName: z.string().min(2, "El nombre visible debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  fieldType: z.enum([
    "TEXT",
    "NUMBER",
    "BOOLEAN",
    "DATE",
    "ENUM",
    "RELATION",
    "FILE",
    "IMAGE",
    "LOCATION",
    "REVERSE_LOOKUP",
  ]),
  isRequired: z.boolean().default(false).optional(),
  isUnique: z.boolean().default(false).optional(),
  defaultValue: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

interface FieldConfigUI {
  [key: string]: unknown;
  multiline?: boolean;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: string[];
  targetCollectionId?: string;
  relationType?: string;
  allowMultiple?: boolean;
  bidirectional?: boolean;
  inverseFieldName?: string;
  displayField?: string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

type FieldFormValues = z.infer<typeof fieldSchema>;

interface FieldFormDialogProps {
  field?: Field;
  onSubmit: (values: FieldFormValues) => Promise<Result<Field>>;
  availableCollections?: Array<{ id: string; name: string; displayName?: string }>;
  children?: React.ReactNode;
}

export function FieldFormDialog({
  field,
  onSubmit,
  availableCollections = [],
  children,
}: FieldFormDialogProps) {
  const { mimeTypes, loading: loadingMimeTypes } = useMimeTypes();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mimeSearch, setMimeSearch] = useState("");

  const form = useForm<FieldFormValues>({
    resolver: zodResolver(fieldSchema),
    defaultValues: field
      ? {
          name: field.name,
          displayName: field.displayName || "",
          description: field.description || "",
          fieldType: field.fieldType.value as FieldFormValues["fieldType"],
          isRequired: field.isRequired,
          isUnique: field.isUnique,
          defaultValue: field.defaultValue || "",
          config: (field.config?.value as FieldConfigUI) || {},
        }
      : {
          name: "",
          displayName: "",
          description: "",
          fieldType: "TEXT",
          isRequired: false,
          isUnique: false,
          defaultValue: "",
          config: {},
        },
  });

  // Reset when open
  useEffect(() => {
    if (open) {
      setError(null);
      if (!field) form.reset();
    }
  }, [open, field, form]);

  const selectedType = form.watch("fieldType");
  const config: FieldConfigUI = form.watch("config") || {};

  const updateConfig = (updates: Partial<FieldConfigUI>) => {
    form.setValue("config", {
      ...(form.getValues("config") || {}),
      ...updates,
    });
  };

  const handleSubmit = async (values: FieldFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await onSubmit(values);
      if (res.ok) {
        setOpen(false);
      } else {
        setError(res.error?.message || "Error desconocido");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar el campo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Añadir Campo</Button>}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,720px)] w-[calc(100vw-1.25rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[480px]",
          "rounded-2xl border-none bg-surface shadow-[0_32px_64px_rgba(0,0,0,0.6)]",
        )}
      >
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2 text-left">
          <DialogTitle className="text-xl font-bold tracking-[-0.01em] text-foreground">
            {field ? "Editar campo" : "Nuevo campo"}
          </DialogTitle>
          <DialogDescription className="font-light text-sm text-foreground/70">
            {field
              ? "Modifica los atributos del campo."
              : "Configura un nuevo campo para el motor de datos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-2">
            <div className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/8 p-3 text-sm text-red-600 dark:text-red-400"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <FormSection title="Datos base">
                <div className="space-y-2">
                  <Label
                    htmlFor="displayName"
                    className="text-[11px] font-semibold uppercase text-foreground/70 flex justify-between"
                  >
                    <span>Nombre visible</span>
                    {form.formState.errors.displayName && (
                      <span className="text-red-400 normal-case tracking-normal">
                        {form.formState.errors.displayName.message}
                      </span>
                    )}
                  </Label>
                  <Input
                    id="displayName"
                    placeholder="ej: Nombre del Cliente"
                    className={cn(
                      inputFieldClass,
                      form.formState.errors.displayName && "border-red-400/50",
                    )}
                    {...form.register("displayName")}
                    onChange={(e) => {
                      form.setValue("displayName", e.target.value);
                      if (!field) {
                        const slug = e.target.value
                          .toLowerCase()
                          .replace(/ /g, "_")
                          .replace(/[^\w-]+/g, "");
                        form.setValue("name", slug);
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-[11px] font-semibold uppercase text-foreground/70"
                  >
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe el propósito de este campo, qué datos almacena y cómo debe utilizarse..."
                    className={cn(inputFieldClass, "min-h-[80px] resize-y")}
                    {...form.register("description")}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-[11px] font-semibold uppercase text-foreground/70 flex justify-between"
                  >
                    <span>ID Técnico</span>
                    {form.formState.errors.name && (
                      <span className="text-red-400 normal-case tracking-normal">
                        {form.formState.errors.name.message}
                      </span>
                    )}
                  </Label>
                  <Input
                    id="name"
                    placeholder="ej_nombre_cliente"
                    disabled={!!field}
                    className={cn(
                      inputFieldClass,
                      "font-mono text-xs",
                      field && "opacity-60 cursor-not-allowed",
                      form.formState.errors.name && "border-red-400/50",
                    )}
                    {...form.register("name")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                    Tipo de dato
                  </Label>
                  <Select
                    disabled={!!field}
                    value={form.watch("fieldType")}
                    onValueChange={(val) =>
                      form.setValue("fieldType", val as FieldFormValues["fieldType"])
                    }
                  >
                    <SelectTrigger className={selectTriggerClass}>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="border-border bg-surface font-poppins text-foreground">
                      <SelectItem value="TEXT">Texto</SelectItem>
                      <SelectItem value="NUMBER">Número</SelectItem>
                      <SelectItem value="BOOLEAN">Sí / No</SelectItem>
                      <SelectItem value="DATE">Fecha</SelectItem>
                      <SelectItem value="ENUM">Lista (enum)</SelectItem>
                      <SelectItem value="RELATION">Relación</SelectItem>
                      <SelectItem value="FILE">Archivo</SelectItem>
                      <SelectItem value="IMAGE">Imagen</SelectItem>
                      <SelectItem value="LOCATION">Ubicación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </FormSection>
              {selectedType === "TEXT" && (
                <FormSection title="Texto">
                  <SwitchRow
                    id="text-multiline"
                    label="Multilínea"
                    checked={!!config.multiline}
                    onCheckedChange={(checked) => updateConfig({ multiline: checked })}
                  />
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                      Placeholder
                    </Label>
                    <Input
                      value={String(config.placeholder || "")}
                      onChange={(e) => updateConfig({ placeholder: e.target.value })}
                      placeholder="Ej: Texto de ayuda opcional"
                      className={inputFieldClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                        Mín. caracteres
                      </Label>
                      <Input
                        type="number"
                        value={String(config.minLength || "")}
                        onChange={(e) =>
                          updateConfig({
                            minLength: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="—"
                        className={inputFieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                        Máx. caracteres
                      </Label>
                      <Input
                        type="number"
                        value={String(config.maxLength || "")}
                        onChange={(e) =>
                          updateConfig({
                            maxLength: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="255"
                        className={inputFieldClass}
                      />
                    </div>
                  </div>
                </FormSection>
              )}

              {selectedType === "NUMBER" && (
                <FormSection title="Número">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                      Placeholder
                    </Label>
                    <Input
                      value={String(config.placeholder || "")}
                      onChange={(e) => updateConfig({ placeholder: e.target.value })}
                      placeholder="Opcional"
                      className={inputFieldClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                        Mínimo
                      </Label>
                      <Input
                        type="number"
                        value={String(config.min || "")}
                        onChange={(e) =>
                          updateConfig({ min: e.target.value ? Number(e.target.value) : undefined })
                        }
                        placeholder="—"
                        className={inputFieldClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                        Máximo
                      </Label>
                      <Input
                        type="number"
                        value={String(config.max || "")}
                        onChange={(e) =>
                          updateConfig({ max: e.target.value ? Number(e.target.value) : undefined })
                        }
                        placeholder="—"
                        className={inputFieldClass}
                      />
                    </div>
                  </div>
                </FormSection>
              )}

              {selectedType === "ENUM" && (
                <FormSection title="Opciones">
                  <TagInput
                    value={config.options || []}
                    onChange={(options) => updateConfig({ options })}
                    placeholder="Enter o coma"
                  />
                </FormSection>
              )}

              {selectedType === "RELATION" && (
                <FormSection title="Relación">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                      Colección Destino
                    </Label>
                    <Select
                      value={String(config.targetCollectionId || "")}
                      onValueChange={(value) => updateConfig({ targetCollectionId: value })}
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-surface text-foreground">
                        {availableCollections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            {collection.displayName || collection.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                      Cardinalidad
                    </Label>
                    <Select
                      value={String(config.relationType || "")}
                      onValueChange={(value) =>
                        updateConfig({
                          relationType: value,
                          allowMultiple: value === "ONE_TO_MANY" || value === "MANY_TO_MANY",
                          displayField:
                            (form.getValues("config") as FieldConfigUI | undefined)?.displayField ||
                            "id",
                        })
                      }
                    >
                      <SelectTrigger className={selectTriggerClass}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent className="border-border bg-surface text-foreground font-poppins">
                        <SelectItem value="ONE_TO_ONE">1:1 (One to One)</SelectItem>
                        <SelectItem value="MANY_TO_ONE">N:1 (Many to One)</SelectItem>
                        <SelectItem value="ONE_TO_MANY">1:N (One to Many)</SelectItem>
                        <SelectItem value="MANY_TO_MANY">N:M (Many to Many)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <SwitchRow
                    id="bidirectional"
                    label="Bidireccional"
                    checked={!!config.bidirectional}
                    onCheckedChange={(checked) => updateConfig({ bidirectional: checked })}
                  />

                  {config.bidirectional && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <Label className="text-[11px] font-semibold uppercase text-foreground/70 flex justify-between">
                        <span>Nombre campo inverso</span>
                      </Label>
                      <Input
                        value={String(config.inverseFieldName || "")}
                        onChange={(e) => updateConfig({ inverseFieldName: e.target.value })}
                        placeholder="ej: ordenes_relacionadas"
                        className={inputFieldClass}
                      />
                      <p className="text-[10px] text-foreground/50 px-1">
                        Se creará un campo virtual en la colección destino para navegar de vuelta.
                      </p>
                    </div>
                  )}
                </FormSection>
              )}

              {(selectedType === "FILE" || selectedType === "IMAGE") && (
                <FormSection title={selectedType === "IMAGE" ? "Imagen" : "Archivo"}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="maxSizeBytes"
                      className="text-[11px] font-semibold uppercase text-foreground/70"
                    >
                      Máx. MegaBytes
                    </Label>
                    <Input
                      id="maxSizeBytes"
                      type="number"
                      min={1}
                      placeholder="10"
                      className={inputFieldClass}
                      value={config.maxSizeBytes ? Number(config.maxSizeBytes) / (1024 * 1024) : ""}
                      onChange={(e) => {
                        const mb = e.target.value ? Number(e.target.value) : undefined;
                        updateConfig({
                          maxSizeBytes: mb ? Math.round(mb * 1024 * 1024) : undefined,
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-semibold uppercase text-foreground/70">
                      Tipos de Archivo (MIME)
                    </Label>

                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                      />
                      <Input
                        placeholder="Buscar por extensión o nombre..."
                        className={cn(inputFieldClass, "h-10 pl-9")}
                        onChange={(e) => {
                          setMimeSearch(e.target.value.toLowerCase());
                        }}
                      />
                    </div>

                    <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg border border-border/50 bg-surface-hover/50 p-1.5 dark:border-border/70 dark:bg-surface/90">
                      {loadingMimeTypes ? (
                        <div className="py-6 text-center text-[10px] text-muted animate-pulse">
                          Cargando…
                        </div>
                      ) : (
                        mimeTypes
                          .filter(
                            (m) =>
                              (selectedType !== "IMAGE" || m.value.startsWith("image/")) &&
                              (!mimeSearch ||
                                m.label.toLowerCase().includes(mimeSearch) ||
                                m.value.toLowerCase().includes(mimeSearch) ||
                                !!m.extension?.toLowerCase().includes(mimeSearch)),
                          )
                          .map((mime) => {
                            const isSelected = (config.allowedMimeTypes || []).includes(mime.value);
                            return (
                              <button
                                key={mime.value}
                                type="button"
                                onClick={() => {
                                  const current =
                                    (form.getValues("config") as FieldConfigUI | undefined)
                                      ?.allowedMimeTypes || [];
                                  const next = isSelected
                                    ? current.filter((v: string) => v !== mime.value)
                                    : [...current, mime.value];
                                  updateConfig({ allowedMimeTypes: next });
                                }}
                                className={cn(
                                  "group flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                                  isSelected
                                    ? "border-primary/20 bg-primary/10 text-primary"
                                    : "border-transparent text-foreground/60 hover:bg-foreground/5 hover:text-foreground",
                                )}
                              >
                                <div className="flex min-w-0 flex-col">
                                  <span className="truncate text-[13px] font-medium text-foreground">
                                    {mime.label}
                                  </span>
                                  <span className="truncate font-mono text-[10px] opacity-60">
                                    {mime.value}
                                  </span>
                                </div>
                                {isSelected ? (
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-background">
                                    <Plus size={12} className="rotate-45" />
                                  </div>
                                ) : (
                                  <Plus
                                    size={14}
                                    className="shrink-0 opacity-0 transition-opacity group-hover:opacity-35"
                                  />
                                )}
                              </button>
                            );
                          })
                      )}
                      {mimeTypes.length > 0 &&
                        mimeTypes.filter(
                          (m) =>
                            (selectedType !== "IMAGE" || m.value.startsWith("image/")) &&
                            (!mimeSearch ||
                              m.label.toLowerCase().includes(mimeSearch) ||
                              m.value.toLowerCase().includes(mimeSearch) ||
                              !!m.extension?.toLowerCase().includes(mimeSearch)),
                        ).length === 0 && (
                          <div className="py-4 text-center text-[11px] text-muted">Vacío</div>
                        )}
                    </div>

                    {(config.allowedMimeTypes || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 border-t border-border/40 pt-2">
                        {(config.allowedMimeTypes || []).map((mValue: string) => {
                          const match = mimeTypes.find((mt) => mt.value === mValue);
                          return (
                            <Badge
                              key={mValue}
                              variant="secondary"
                              className="h-6 gap-1 border-primary/15 bg-primary/5 px-2 text-[10px] text-primary"
                            >
                              {match?.extension || mValue.split("/")[1]}
                              <button
                                type="button"
                                onClick={() => {
                                  const current =
                                    (form.getValues("config") as FieldConfigUI | undefined)
                                      ?.allowedMimeTypes || [];
                                  const next = current.filter((v: string) => v !== mValue);
                                  updateConfig({ allowedMimeTypes: next });
                                }}
                                className="ml-0.5 rounded-sm hover:text-red-500"
                              >
                                <X size={10} />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </FormSection>
              )}

              {selectedType === "LOCATION" && (
                <FormSection title="Ubicación">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="minLat"
                        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Lat. mín.
                      </Label>
                      <Input
                        id="minLat"
                        type="number"
                        className={inputFieldClass}
                        value={config.minLat ?? ""}
                        onChange={(e) =>
                          updateConfig({
                            minLat: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="maxLat"
                        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Lat. máx.
                      </Label>
                      <Input
                        id="maxLat"
                        type="number"
                        className={inputFieldClass}
                        value={config.maxLat ?? ""}
                        onChange={(e) =>
                          updateConfig({
                            maxLat: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="minLng"
                        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Lng. mín.
                      </Label>
                      <Input
                        id="minLng"
                        type="number"
                        className={inputFieldClass}
                        value={config.minLng ?? ""}
                        onChange={(e) =>
                          updateConfig({
                            minLng: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="maxLng"
                        className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
                      >
                        Lng. máx.
                      </Label>
                      <Input
                        id="maxLng"
                        type="number"
                        className={inputFieldClass}
                        value={config.maxLng ?? ""}
                        onChange={(e) =>
                          updateConfig({
                            maxLng: e.target.value === "" ? undefined : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </FormSection>
              )}

              <FormSection title="Comportamiento Adicional" className="border-none">
                {!["RELATION", "FILE", "IMAGE", "LOCATION"].includes(selectedType) && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="defaultValue"
                      className="text-[11px] font-semibold uppercase text-foreground/70"
                    >
                      Valor por defecto
                    </Label>
                    {selectedType === "BOOLEAN" ? (
                      <Select
                        value={form.watch("defaultValue")}
                        onValueChange={(val) => form.setValue("defaultValue", val)}
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-surface text-foreground rounded-lg">
                          <SelectItem value="true">Sí</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : selectedType === "ENUM" ? (
                      <Select
                        value={form.watch("defaultValue")}
                        onValueChange={(val) => form.setValue("defaultValue", val)}
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent className="border-border bg-surface text-foreground rounded-lg">
                          {(config.options || []).map((opt: string) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="defaultValue"
                        placeholder="Opcional"
                        className={inputFieldClass}
                        {...form.register("defaultValue")}
                      />
                    )}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <SwitchRow
                    id="isRequired"
                    label="Obligatorio"
                    checked={!!form.watch("isRequired")}
                    onCheckedChange={(val) => form.setValue("isRequired", val)}
                  />
                  <SwitchRow
                    id="isUnique"
                    label="Único"
                    checked={!!form.watch("isUnique")}
                    onCheckedChange={(val) => form.setValue("isUnique", val)}
                  />
                </div>
              </FormSection>
            </div>
          </div>

          <div className="shrink-0 bg-transparent px-6 py-4">
            <DialogFooter className="flex-col gap-2 p-0 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="text-foreground/60 hover:bg-foreground/5 hover:text-foreground font-semibold rounded-lg"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full bg-primary font-semibold text-primary-foreground rounded-lg shadow-sm transition-all hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-0 sm:w-auto sm:min-w-[140px]"
                disabled={loading}
              >
                {loading ? "Guardando..." : field ? "Guardar Cambios" : "Crear Campo"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
