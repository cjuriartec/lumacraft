"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
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
import { Textarea } from "@/shared/presentation/components/ui/textarea";

import { Field } from "../../domain/entities/field.entity";
import { DataRecord } from "../../domain/entities/record.entity";
import { useRelationRecords } from "../hooks/use-relation-records";
import { useStorage } from "../hooks/use-storage";

interface RecordFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fields: Field[];
  record?: DataRecord;
  onSubmit: (
    data: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: { message: string } } | void>;
}

type FileMetadata = {
  bucket: string;
  path: string;
  name: string;
  mimeType: string;
  size: number;
};

const FILE_BUCKET = "record_files";

function isFileLikeFieldType(fieldType: Field["fieldType"]["value"]): boolean {
  return fieldType === "FILE" || fieldType === "IMAGE";
}

export function RecordFormDialog({
  open,
  onOpenChange,
  fields,
  record,
  onSubmit,
}: RecordFormDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const {
    options: relationOptions,
    loading: relationLoading,
    searchRelations,
    fetchOptionsByIds,
    findReverseRelations,
  } = useRelationRecords();
  const { uploadFile, deleteFiles } = useStorage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationQuery, setRelationQuery] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({});
  const relationTimers = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const getRelationConfig = (field: Field) =>
    (field.config?.value as
      | { targetCollectionId?: string; displayField?: string; relationType?: string }
      | undefined) ?? {};

  const relationFieldAllowsMany = (field: Field) => {
    const config = getRelationConfig(field);
    return config.relationType === "ONE_TO_MANY" || config.relationType === "MANY_TO_MANY";
  };

  const isReverseLookup = (field: Field) => field.fieldType.value === "REVERSE_LOOKUP";

  // Generate dynamic schema based on fields
  const getDynamicSchema = () => {
    const shape: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
      let validator: z.ZodTypeAny = z.unknown();

      if (field.fieldType.value === "LOCATION") {
        validator = z
          .object({
            lat: z.coerce.number().min(-90).max(90),
            lng: z.coerce.number().min(-180).max(180),
          })
          .optional();
      } else if (field.fieldType.value === "RELATION") {
        validator = relationFieldAllowsMany(field)
          ? z.array(z.string().uuid()).optional()
          : z.string().uuid().optional();
      } else if (isFileLikeFieldType(field.fieldType.value) || isReverseLookup(field)) {
        validator = z.unknown().optional();
      } else {
        const config = field.config?.value as
          | { min?: number; max?: number; minLength?: number; maxLength?: number }
          | undefined;

        switch (field.fieldType.value) {
          case "NUMBER": {
            let numVal = z.coerce.number({ message: "Debe ser un número" });
            if (config?.min !== undefined) numVal = numVal.min(config.min, `Mínimo ${config.min}`);
            if (config?.max !== undefined) numVal = numVal.max(config.max, `Máximo ${config.max}`);

            if (field.isRequired) {
              validator = numVal;
            } else {
              validator = z.preprocess(
                (val) => (val === "" || val === null ? undefined : val),
                numVal.optional(),
              );
            }
            break;
          }
          case "TEXT": {
            let strVal = z.string();
            if (config?.minLength !== undefined)
              strVal = strVal.min(config.minLength, `Mínimo ${config.minLength} caracteres`);
            if (config?.maxLength !== undefined)
              strVal = strVal.max(config.maxLength, `Máximo ${config.maxLength} caracteres`);

            if (field.isRequired) {
              validator = strVal.min(1, "Este campo es obligatorio");
            } else {
              validator = strVal.optional().or(z.literal(""));
            }
            break;
          }
          case "BOOLEAN":
            validator = z.boolean().default(false);
            break;
          case "DATE":
            validator = field.isRequired
              ? z.string().min(1, "La fecha es obligatoria")
              : z.string().optional().or(z.literal(""));
            break;
          default:
            validator = field.isRequired
              ? z.string().min(1, "Este campo es obligatorio")
              : z.unknown().optional();
        }
      }

      shape[field.name] = validator;
    });

    return z.object(shape);
  };

  const form = useForm({
    resolver: zodResolver(getDynamicSchema()),
    defaultValues: record?.data || {},
  });

  // Reset form when record changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset(record?.data || {});
      setError(null);
      setPendingFiles({});

      // Initial fetch for all relation fields
      fields.forEach((field) => {
        if (field.fieldType.value === "RELATION") {
          // 1. Initial list of potential relations
          void searchRelations(field, "");

          // 2. Resolve label for CURRENTLY SELECTED relation(s)
          const val = record?.data?.[field.name];
          if (val) {
            const ids = Array.isArray(val)
              ? val.filter((v) => typeof v === "string")
              : typeof val === "string"
                ? [val]
                : [];

            if (ids.length > 0) {
              void fetchOptionsByIds(field, ids);
            }
          }
        } else if (field.fieldType.value === "REVERSE_LOOKUP" && record?.id) {
          // Resolve reverse relations
          void findReverseRelations(field, record.id);
        }
      });
    }
  }, [open, record, form, fields, searchRelations, fetchOptionsByIds, findReverseRelations]);

  useEffect(() => {
    const timers = relationTimers.current;
    return () => {
      Object.values(timers).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const queueRelationFetch = (field: Field, query: string) => {
    setRelationQuery((prev) => ({ ...prev, [field.name]: query }));

    if (relationTimers.current[field.name]) {
      clearTimeout(relationTimers.current[field.name]!);
    }

    relationTimers.current[field.name] = setTimeout(() => {
      void searchRelations(field, query);
    }, 250);
  };

  const normalizeFileMetadata = async (values: Record<string, unknown>) => {
    if (!currentWorkspace) {
      throw new Error("No hay workspace activo para subir archivos.");
    }

    const nextValues = { ...values };

    for (const field of fields) {
      if (!isFileLikeFieldType(field.fieldType.value)) continue;

      const selectedFile = pendingFiles[field.name];
      if (!selectedFile) continue;

      const config =
        (field.config?.value as
          | { allowedMimeTypes?: string[]; maxSizeBytes?: number }
          | undefined) ?? {};

      // Validate Mime Type
      if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
        const fileMime = selectedFile.type || "application/octet-stream";
        if (!config.allowedMimeTypes.includes(fileMime)) {
          throw new Error(
            `Tipo de archivo no permitido para el campo "${field.displayName || field.name}". Permitidos: ${config.allowedMimeTypes.join(", ")}`,
          );
        }
      }

      if (field.fieldType.value === "IMAGE" && !selectedFile.type.startsWith("image/")) {
        throw new Error(`El campo "${field.displayName || field.name}" solo acepta imágenes.`);
      }

      // Validate Size
      if (config.maxSizeBytes && selectedFile.size > config.maxSizeBytes) {
        const maxMb = (config.maxSizeBytes / (1024 * 1024)).toFixed(2);
        throw new Error(
          `El archivo para el campo "${field.displayName || field.name}" excede el tamaño máximo de ${maxMb}MB.`,
        );
      }

      const uniqueName = `${Date.now()}-${selectedFile.name}`;
      const filePath = `${currentWorkspace.id}/${field.collectionId}/${field.name}/${uniqueName}`;
      const oldFile = nextValues[field.name] as FileMetadata | undefined;

      const upload = await uploadFile(FILE_BUCKET, filePath, selectedFile);

      if (!upload.ok) {
        throw new Error(upload.error.message);
      }

      nextValues[field.name] = {
        bucket: FILE_BUCKET,
        path: upload.value.path,
        name: selectedFile.name,
        mimeType: selectedFile.type || "application/octet-stream",
        size: selectedFile.size,
      } satisfies FileMetadata;

      if (oldFile?.path && oldFile.path !== upload.value.path) {
        void deleteFiles(FILE_BUCKET, [oldFile.path]);
      }
    }

    return nextValues;
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const normalizedValues = await normalizeFileMetadata(values);
      const res = await onSubmit(normalizedValues);
      if (res?.ok) {
        onOpenChange(false);
        form.reset();
      } else {
        setError(res?.error?.message || "No se pudo guardar el registro.");
      }
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const renderRelationInput = (field: Field) => {
    const selectedValue = form.watch(field.name);
    const options = relationOptions[field.name] || [];
    const isMany = relationFieldAllowsMany(field);
    const query = relationQuery[field.name] || "";
    const isLoading = relationLoading[field.name] ?? false;
    const selectedIds = Array.isArray(selectedValue)
      ? selectedValue.filter((value): value is string => typeof value === "string")
      : [];
    const selectedSingleValue = typeof selectedValue === "string" ? selectedValue : undefined;

    return (
      <div className="space-y-3">
        <Label className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 ml-1 truncate block">
          {field.displayName || field.name}
        </Label>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary/50 transition-colors" />
          <Input
            placeholder="Escribe para buscar registros..."
            className="pl-9 bg-background border-border/50 text-foreground text-sm focus-visible:ring-primary/20 rounded-xl"
            value={query}
            onFocus={() => {
              if (query === "" && options.length === 0) {
                queueRelationFetch(field, "");
              }
            }}
            onChange={(e) => queueRelationFetch(field, e.target.value)}
          />
          {isLoading && query !== "" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 size={14} className="animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Selected Items Badges (Many-to-Many / One-to-Many) */}
        {isMany && selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2.5 rounded-xl bg-foreground/2 border border-border/30">
            {selectedIds.map((id) => {
              const label = options.find((option) => option.id === id)?.label || id;
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="group h-7 pl-2.5 pr-1 gap-1.5 bg-background border-border/50 text-foreground/80 hover:text-primary transition-all rounded-lg"
                >
                  <span className="max-w-[150px] truncate">{label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedIds.filter((item) => item !== id);
                      form.setValue(field.name, next);
                    }}
                    className="p-0.5 rounded-full hover:bg-foreground/10 text-muted-foreground/50 hover:text-foreground transition-colors"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {/* Results List */}
        {options.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border/40 bg-surface shadow-sm">
            <div className="max-h-[200px] overflow-y-auto divide-y divide-border/10">
              {options.map((option) => {
                const isSelected = isMany
                  ? selectedIds.includes(option.id)
                  : selectedSingleValue === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      if (isMany) {
                        const base = selectedIds;
                        const next = isSelected
                          ? base.filter((item) => item !== option.id)
                          : [...base, option.id];
                        form.setValue(field.name, next);
                      } else {
                        form.setValue(field.name, isSelected ? undefined : option.id);
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-all duration-200",
                      isSelected
                        ? "bg-primary/5 text-primary"
                        : "hover:bg-foreground/2 text-foreground/70 hover:text-foreground",
                    )}
                  >
                    <span className="truncate flex-1 font-medium">{option.label}</span>
                    {isSelected && (
                      <div className="ml-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check size={10} className="text-background stroke-[3px]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading State for empty initial search */}
        {isLoading && query === "" && options.length === 0 && (
          <div className="flex items-center gap-2 justify-center py-6 text-xs text-muted-foreground/60 animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            Recuperando registros...
          </div>
        )}

        {/* No Results State */}
        {!isLoading && query !== "" && options.length === 0 && (
          <div className="text-center py-6 text-xs text-muted/40 italic bg-foreground/1 border border-dashed border-border/30 rounded-xl">
            No se encontraron resultados vinculables.
          </div>
        )}

        {/* One-to-One / Many-to-One support - if not isMany, show indicator if selected */}
        {!isMany && selectedSingleValue && options.length === 0 && !isLoading && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <span className="text-sm font-medium text-primary/80 truncate">
              ID Vinculado: {selectedSingleValue}
            </span>
            <button
              type="button"
              onClick={() => form.setValue(field.name, undefined)}
              className="text-[10px] uppercase font-bold text-primary hover:underline"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderFieldInput = (field: Field) => {
    const { name, fieldType, displayName, config } = field;

    switch (fieldType.value) {
      case "BOOLEAN":
        return (
          <div className="flex items-center space-x-2 py-2">
            <Switch
              id={name}
              checked={!!form.watch(name)}
              onCheckedChange={(val) => form.setValue(name, val)}
            />
            <Label htmlFor={name} className="text-muted truncate block">
              {displayName || name}
            </Label>
          </div>
        );

      case "ENUM":
        const options = (config?.value as { options?: string[] })?.options || [];
        return (
          <div className="space-y-2">
            <Label className="text-muted">{displayName || name}</Label>
            <Select
              value={(form.watch(name) as string) || ""}
              onValueChange={(val) => form.setValue(name, val)}
            >
              <SelectTrigger className="bg-background border-border text-foreground">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-border text-foreground font-poppins">
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "NUMBER":
        return (
          <div className="space-y-2">
            <Label htmlFor={name} className="text-muted truncate block">
              {displayName || name}
            </Label>
            <Input
              id={name}
              type="number"
              className="bg-background border-border text-foreground placeholder:text-muted/40"
              placeholder={(config?.value as { placeholder?: string })?.placeholder || ""}
              {...form.register(name)}
              value={(form.watch(name) as string | number) ?? ""}
            />
          </div>
        );

      case "TEXT": {
        const textCfg = (config?.value ?? {}) as { placeholder?: string; multiline?: boolean };
        const placeholder = textCfg.placeholder || "";
        const currentValue = form.watch(name);

        if (textCfg.multiline) {
          return (
            <div className="space-y-2">
              <Label htmlFor={name} className="text-muted truncate block">
                {displayName || name}
              </Label>
              <Textarea
                id={name}
                rows={4}
                className="bg-background border-border text-foreground placeholder:text-muted/40 resize-y min-h-[100px]"
                placeholder={placeholder}
                {...form.register(name)}
                value={(currentValue as string) ?? ""}
                enableAI={true}
              />
            </div>
          );
        }
        return (
          <div className="space-y-2">
            <Label htmlFor={name} className="text-muted truncate block">
              {displayName || name}
            </Label>
            <Input
              id={name}
              className="bg-background border-border text-foreground placeholder:text-muted/40"
              placeholder={placeholder}
              {...form.register(name)}
              value={(currentValue as string) ?? ""}
              enableAI={true}
            />
          </div>
        );
      }

      case "DATE":
        return (
          <div className="space-y-2">
            <Label htmlFor={name} className="text-muted truncate block">
              {displayName || name}
            </Label>
            <Input
              id={name}
              type="date"
              className="bg-background border-border text-foreground"
              {...form.register(name)}
              value={(form.watch(name) as string) || ""}
            />
          </div>
        );

      case "RELATION":
        return renderRelationInput(field);

      case "FILE":
      case "IMAGE":
        const fileValue = form.watch(name) as FileMetadata | undefined;
        const pending = pendingFiles[name];
        const isImageField = fieldType.value === "IMAGE";
        return (
          <div className="group relative">
            <label
              htmlFor={`${name}-file`}
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-3 cursor-pointer transition-all duration-300",
                pending || fileValue
                  ? "bg-primary/5 border-primary/40 ring-1 ring-primary/10"
                  : "bg-background border-border/60 hover:bg-surface-hover/20 hover:border-primary/30",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                    pending || fileValue
                      ? "bg-primary text-background"
                      : "bg-foreground/5 text-muted",
                  )}
                >
                  <Upload size={16} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-foreground/80 truncate">
                    {pending?.name ||
                      fileValue?.name ||
                      (isImageField ? "Seleccionar Imagen" : "Seleccionar Archivo")}
                  </span>
                  {pending || fileValue ? (
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {((pending?.size || fileValue?.size || 0) / (1024 * 1024)).toFixed(2)} MB •{" "}
                      {pending?.type || fileValue?.mimeType || "archivo"}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted opacity-60">
                      Haga clic o arrastre para subir
                    </span>
                  )}
                </div>
              </div>

              {pending || fileValue ? (
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-all animate-in zoom-in-75"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPendingFiles((prev) => ({ ...prev, [name]: null }));
                    form.setValue(name, undefined);
                    const input = document.getElementById(`${name}-file`) as HTMLInputElement;
                    if (input) input.value = "";
                  }}
                >
                  <Trash2 size={14} />
                </button>
              ) : (
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-muted group-hover:text-primary transition-colors">
                  <Plus size={16} />
                </div>
              )}
            </label>

            <Input
              id={`${name}-file`}
              type="file"
              className="hidden"
              accept={isImageField ? "image/*" : undefined}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setPendingFiles((prev) => ({ ...prev, [name]: selected }));
              }}
            />
          </div>
        );

      case "LOCATION":
        const location = (form.watch(name) as { lat?: number; lng?: number } | undefined) ?? {};
        return (
          <div className="space-y-2">
            <Label className="text-muted">{displayName || name}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="any"
                placeholder="Latitud"
                className="bg-background border-border text-foreground"
                value={location.lat ?? ""}
                onChange={(e) =>
                  form.setValue(name, {
                    lat: e.target.value === "" ? undefined : Number(e.target.value),
                    lng: location.lng,
                  })
                }
              />
              <Input
                type="number"
                step="any"
                placeholder="Longitud"
                className="bg-background border-border text-foreground"
                value={location.lng ?? ""}
                onChange={(e) =>
                  form.setValue(name, {
                    lat: location.lat,
                    lng: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        );

      case "REVERSE_LOOKUP": {
        const reverseData = record?.data?.[name];
        const reverseItems = Array.isArray(reverseData)
          ? reverseData
          : reverseData
            ? [reverseData]
            : [];

        return (
          <div className="space-y-4 p-5 rounded-2xl bg-foreground/2 border border-border/30">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/70 truncate block">
                  {displayName || name}
                </Label>
                <p className="text-[10px] text-muted-foreground/40 leading-tight pr-8">
                  Vínculos inversos calculados. Los cambios en otras colecciones se reflejarán aquí
                  automáticamente.
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[9px] uppercase tracking-widest opacity-40 border-border/40 px-2 h-4.5 font-bold"
              >
                Inverso
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {reverseItems.length > 0 ? (
                reverseItems.map((item: Record<string, unknown> | string, idx) => {
                  const isObj = typeof item === "object" && item !== null;
                  const label = isObj
                    ? (item as Record<string, string>).displayName ||
                      (item as Record<string, string>).name ||
                      (item as Record<string, string>).id
                    : String(item);
                  return (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="bg-primary/5 text-primary/70 border-primary/10 hover:bg-primary/10 transition-colors pointer-events-none max-w-full"
                    >
                      <span className="truncate">{label}</span>
                    </Badge>
                  );
                })
              ) : (
                <div className="flex items-center gap-2 py-3 px-4 rounded-xl bg-foreground/2 border border-border/10 w-full justify-center">
                  <span className="text-[10px] text-muted-foreground/30 font-medium italic">
                    Sin registros vinculados actualmente
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="space-y-2">
            <Label htmlFor={name} className="text-muted truncate block">
              {displayName || name}
            </Label>
            <Input
              id={name}
              className="bg-background border-border text-foreground placeholder:text-muted/40"
              placeholder={(config?.value as { placeholder?: string })?.placeholder || ""}
              {...form.register(name)}
              value={(form.watch(name) as string) ?? ""}
              enableAI={true}
            />
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-surface border-border overflow-y-auto overflow-x-hidden max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {record ? "Editar Registro" : "Nuevo Registro"}
          </DialogTitle>
          <DialogDescription className="text-muted text-xs">
            {record
              ? "Modifica los valores de este registro."
              : "Añade una nueva fila de datos a esta colección."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 py-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500 text-xs animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={14} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {fields.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted text-sm italic">Primero debes definir campos.</p>
            </div>
          ) : (
            fields.map((field) => (
              <div key={field.id} className="min-w-0">
                {renderFieldInput(field)}
                {form.formState.errors[field.name] && (
                  <p className="text-xs text-red-500 mt-1">
                    {String(form.formState.errors[field.name]?.message)}
                  </p>
                )}
              </div>
            ))
          )}

          <DialogFooter className="pt-4 border-t border-border gap-2">
            <Button
              type="button"
              variant="ghost"
              className="text-muted hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-primary text-background hover:bg-primary-hover"
              disabled={loading || fields.length === 0}
            >
              {loading ? "Guardando..." : record ? "Actualizar" : "Crear Registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
