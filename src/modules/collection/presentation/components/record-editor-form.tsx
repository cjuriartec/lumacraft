"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Eye, Loader2, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
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
import { RelatedRecordSummary } from "../lib/record-relations";
import { RecordQuickViewDialog } from "./record-quick-view-dialog";

interface RecordEditorFormProps {
  fields: Field[];
  record?: Pick<DataRecord, "id" | "data">;
  onSubmit: (
    data: Record<string, unknown>,
  ) => Promise<{ ok: boolean; error?: { message: string } } | void>;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  layout?: "dialog" | "inline";
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

export function RecordEditorForm({
  fields,
  record,
  onSubmit,
  onCancel,
  submitLabel,
  cancelLabel = "Cancelar",
  layout = "dialog",
}: RecordEditorFormProps) {
  const { currentWorkspace } = useWorkspace();
  const {
    options: relationOptions,
    loading: relationLoading,
    searchRelations,
    fetchOptionsByIds,
    findReverseRelations,
  } = useRelationRecords();
  const { uploadFile, deleteFiles, getPublicUrl } = useStorage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationQuery, setRelationQuery] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({});
  const [previewTarget, setPreviewTarget] = useState<RelatedRecordSummary | null>(null);
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

            validator = field.isRequired
              ? numVal
              : z.preprocess(
                  (val) => (val === "" || val === null ? undefined : val),
                  numVal.optional(),
                );
            break;
          }
          case "TEXT": {
            let strVal = z.string();
            if (config?.minLength !== undefined)
              strVal = strVal.min(config.minLength, `Mínimo ${config.minLength} caracteres`);
            if (config?.maxLength !== undefined)
              strVal = strVal.max(config.maxLength, `Máximo ${config.maxLength} caracteres`);

            validator = field.isRequired
              ? strVal.min(1, "Este campo es obligatorio")
              : strVal.optional().or(z.literal(""));
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

  useEffect(() => {
    form.reset(record?.data || {});
    setError(null);
    setPendingFiles({});

    fields.forEach((field) => {
      if (field.fieldType.value === "RELATION") {
        void searchRelations(field, "");

        const val = record?.data?.[field.name];
        if (val) {
          const ids = Array.isArray(val)
            ? val.filter((v): v is string => typeof v === "string")
            : typeof val === "string"
              ? [val]
              : [];

          if (ids.length > 0) {
            void fetchOptionsByIds(field, ids);
          }
        }
      } else if (field.fieldType.value === "REVERSE_LOOKUP" && record?.id) {
        void findReverseRelations(field, record.id);
      }
    });
  }, [record, form, fields, searchRelations, fetchOptionsByIds, findReverseRelations]);

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
      if (!res?.ok && res !== undefined) {
        setError(res.error?.message || "No se pudo guardar el registro.");
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
        <Label className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
          {field.displayName || field.name}
        </Label>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40 transition-colors group-focus-within:text-primary/50" />
          <Input
            placeholder="Escribe para buscar registros..."
            className="rounded-xl border-border/50 bg-background pl-9 text-sm text-foreground focus-visible:ring-primary/20"
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

        {isMany && selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2 rounded-xl border border-border/30 bg-foreground/2 p-2.5">
            {selectedIds.map((id) => {
              const label = options.find((option) => option.id === id)?.label || id;
              return (
                <Badge
                  key={id}
                  variant="secondary"
                  className="group min-h-7 gap-1.5 whitespace-normal rounded-lg border-border/50 bg-background py-1 pl-2.5 pr-1 text-foreground/80 transition-all hover:text-primary"
                >
                  <span className="wrap-break-word font-medium leading-tight">{label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedIds.filter((item) => item !== id);
                      form.setValue(field.name, next);
                    }}
                    className="rounded-full p-0.5 text-muted-foreground/50 transition-colors hover:bg-foreground/10 hover:text-foreground"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {options.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border/40 bg-surface shadow-sm">
            <div className="max-h-[200px] divide-y divide-border/10 overflow-y-auto">
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
                        const next = isSelected
                          ? selectedIds.filter((item) => item !== option.id)
                          : [...selectedIds, option.id];
                        form.setValue(field.name, next);
                      } else {
                        form.setValue(field.name, isSelected ? undefined : option.id);
                      }
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-all duration-200",
                      isSelected
                        ? "bg-primary/5 text-primary"
                        : "text-foreground/70 hover:bg-foreground/2 hover:text-foreground",
                    )}
                  >
                    <span className="flex-1 whitespace-normal py-0.5 font-medium wrap-break-word">
                      {option.label}
                    </span>
                    {isSelected && (
                      <div className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                        <Check size={10} className="stroke-[3px] text-background" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isLoading && query === "" && options.length === 0 && (
          <div className="flex animate-pulse items-center justify-center gap-2 py-6 text-xs text-muted-foreground/60">
            <Loader2 size={12} className="animate-spin" />
            Recuperando registros...
          </div>
        )}

        {!isLoading && query !== "" && options.length === 0 && (
          <div className="rounded-xl border border-dashed border-border/30 bg-foreground/1 py-6 text-center text-xs italic text-muted/40">
            No se encontraron resultados vinculables.
          </div>
        )}

        {!isMany && selectedSingleValue && options.length === 0 && !isLoading && (
          <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
            <span className="whitespace-normal py-1 text-sm font-medium text-primary/80 wrap-break-word">
              ID Vinculado: {selectedSingleValue}
            </span>
            <button
              type="button"
              onClick={() => form.setValue(field.name, undefined)}
              className="text-[10px] font-bold uppercase text-primary hover:underline"
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
            <Label
              htmlFor={name}
              className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40"
            >
              {displayName || name}
            </Label>
          </div>
        );

      case "ENUM": {
        const options = (config?.value as { options?: string[] })?.options || [];
        return (
          <div className="space-y-2">
            <Label className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
              {displayName || name}
            </Label>
            <Select
              value={(form.watch(name) as string) || ""}
              onValueChange={(val) => form.setValue(name, val)}
            >
              <SelectTrigger className="border-border bg-background text-foreground">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent className="border-border bg-surface font-poppins text-foreground">
                {options.map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      case "NUMBER":
        return (
          <div className="space-y-2">
            <Label
              htmlFor={name}
              className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40"
            >
              {displayName || name}
            </Label>
            <Input
              id={name}
              type="number"
              className="border-border bg-background text-foreground placeholder:text-muted/40"
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
              <Label
                htmlFor={name}
                className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40"
              >
                {displayName || name}
              </Label>
              <Textarea
                id={name}
                rows={4}
                className="min-h-[100px] resize-y border-border bg-background text-foreground placeholder:text-muted/40"
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
            <Label
              htmlFor={name}
              className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40"
            >
              {displayName || name}
            </Label>
            <Input
              id={name}
              className="border-border bg-background text-foreground placeholder:text-muted/40"
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
            <Label
              htmlFor={name}
              className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40"
            >
              {displayName || name}
            </Label>
            <Input
              id={name}
              type="date"
              className="border-border bg-background text-foreground"
              {...form.register(name)}
              value={(form.watch(name) as string) || ""}
            />
          </div>
        );

      case "RELATION":
        return renderRelationInput(field);

      case "FILE":
      case "IMAGE": {
        const fileValue = form.watch(name) as FileMetadata | undefined;
        const pending = pendingFiles[name];
        const isImageField = fieldType.value === "IMAGE";

        const handleViewFile = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          if (fileValue?.path) {
            const res = getPublicUrl(fileValue.bucket, fileValue.path);
            if (res.ok) {
              window.open(res.value, "_blank");
            }
          }
        };

        return (
          <div className="group relative">
            <div className="mb-2 flex items-center justify-between">
              <Label className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
                {displayName || name}
              </Label>
              {fileValue?.path && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5"
                  onClick={handleViewFile}
                >
                  <Eye size={12} />
                  Ver Documento
                </Button>
              )}
            </div>
            <label
              htmlFor={`${name}-file`}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-3 transition-all duration-300",
                pending || fileValue
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/10"
                  : "border-border/60 bg-background hover:border-primary/30 hover:bg-surface-hover/20",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                    pending || fileValue
                      ? "bg-primary text-background shadow-lg shadow-primary/20"
                      : "bg-foreground/5 text-muted",
                  )}
                >
                  <Upload size={16} />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-foreground/80">
                    {pending?.name ||
                      fileValue?.name ||
                      (isImageField ? "Seleccionar Imagen" : "Seleccionar Archivo")}
                  </span>
                  {pending || fileValue ? (
                    <span className="font-mono text-[9px] text-muted-foreground">
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
                  className="flex h-8 w-8 animate-in items-center justify-center rounded-lg bg-red-500/10 text-red-500 transition-all zoom-in-75 hover:bg-red-500/20"
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors group-hover:text-primary">
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
      }

      case "LOCATION": {
        const location = (form.watch(name) as { lat?: number; lng?: number } | undefined) ?? {};
        return (
          <div className="space-y-2">
            <Label className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
              {displayName || name}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                step="any"
                placeholder="Latitud"
                className="border-border bg-background text-foreground"
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
                className="border-border bg-background text-foreground"
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
      }

      case "REVERSE_LOOKUP": {
        const reverseItems = relationOptions[name] || [];
        const reverseCollectionId =
          ((field.config?.value as { targetCollectionId?: string } | undefined)
            ?.targetCollectionId as string | undefined) ?? "";
        const isLoading = relationLoading[name] ?? false;

        return (
          <div className="space-y-4 rounded-2xl border border-border/30 bg-foreground/2 p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <Label className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40">
                  {displayName || name}
                </Label>
                <p className="pr-8 text-[10px] leading-tight text-muted-foreground/40">
                  Vínculos inversos calculados. Los cambios en otras colecciones se reflejarán aquí
                  automáticamente.
                </p>
              </div>
              <Badge
                variant="outline"
                className="h-4.5 border-border/40 px-2 text-[9px] font-bold uppercase tracking-widest opacity-40"
              >
                Inverso
              </Badge>
            </div>

            <div className="flex min-h-[32px] flex-wrap gap-2">
              {isLoading ? (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/10 bg-foreground/2 px-4 py-3">
                  <Loader2 size={12} className="animate-spin text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground/50">
                    Resolviendo vínculos inversos...
                  </span>
                </div>
              ) : reverseItems.length > 0 ? (
                reverseItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      reverseCollectionId &&
                      setPreviewTarget({
                        id: item.id,
                        label: item.label,
                        collectionId: reverseCollectionId,
                        collectionName: "",
                      })
                    }
                    className="max-w-full rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-1.5 text-left text-xs text-primary/70 transition-colors hover:border-primary/30 hover:bg-primary/10"
                  >
                    <span className="whitespace-normal font-medium leading-tight wrap-break-word">
                      {item.label}
                    </span>
                  </button>
                ))
              ) : (
                <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/10 bg-foreground/2 px-4 py-3">
                  <span className="text-[10px] font-medium italic text-muted-foreground/30">
                    Sin vínculos inversos actualmente
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
            <Label
              htmlFor={name}
              className="ml-1 block truncate text-[10px] font-semibold uppercase tracking-widest text-foreground/40"
            >
              {displayName || name}
            </Label>
            <Input
              id={name}
              className="border-border bg-background text-foreground placeholder:text-muted/40"
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
    <>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={14} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {fields.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm italic text-muted">Primero debes definir campos.</p>
          </div>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="min-w-0">
              {renderFieldInput(field)}
              {form.formState.errors[field.name] && (
                <p className="mt-1 text-xs text-red-500">
                  {String(form.formState.errors[field.name]?.message)}
                </p>
              )}
            </div>
          ))
        )}

        <div
          className={cn(
            "flex gap-2 pt-4",
            layout === "dialog"
              ? "border-t border-border justify-end"
              : "sticky bottom-0 -mx-6 mt-8 border-t border-border/40 bg-surface/95 px-6 pb-0 pt-4 backdrop-blur supports-[backdrop-filter]:bg-surface/85 md:-mx-8 md:px-8",
          )}
        >
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              className="text-muted hover:text-foreground"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          )}
          <Button
            type="submit"
            className="bg-primary text-background hover:bg-primary-hover"
            disabled={loading || fields.length === 0}
          >
            {loading ? "Guardando..." : submitLabel || (record ? "Actualizar" : "Crear Registro")}
          </Button>
        </div>
      </form>

      <RecordQuickViewDialog
        open={previewTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setPreviewTarget(null)}
        target={previewTarget}
      />
    </>
  );
}
