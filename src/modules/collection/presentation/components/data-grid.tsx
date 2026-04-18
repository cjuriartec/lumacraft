"use client";

import {
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  Edit2,
  Eye,
  FileText,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { RecordDocumentSelectorModal } from "@/modules/document/presentation/components/record-document-selector-modal";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/presentation/components/ui/dropdown-menu";
import { Input } from "@/shared/presentation/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/presentation/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { Switch } from "@/shared/presentation/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/components/ui/table";

import { Field } from "../../domain/entities/field.entity";
import { DataRecord } from "../../domain/entities/record.entity";
import { formatShortRecordId } from "../../domain/services/record-label.service";
import { ColumnFilter } from "../../domain/types/pagination.types";
import { RecordQuickViewDialog } from "../components/record-quick-view-dialog";
import { ReverseLookupResults } from "../hooks/use-records";
import { RelationOption, useRelationRecords } from "../hooks/use-relation-records";
import { useStorage } from "../hooks/use-storage";
import { RelatedRecordSummary } from "../lib/record-relations";

interface DataGridProps {
  collectionId?: string;
  fields: Field[];
  records: DataRecord[];
  total: number;
  currentPage: number;
  pageSize: number;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  search?: string;
  onSearchChange: (value: string) => void;
  onFiltersChange: (filters: ColumnFilter[], rawValues: Record<string, string>) => void;
  onPageChange: (page: number) => void;
  onSort: (field: string, direction: "asc" | "desc") => void;
  onInlineEdit: (record: DataRecord, field: Field, value: unknown) => Promise<void> | void;
  onEdit: (record: DataRecord) => void;
  onDelete: (id: string) => void;
  onAddRecord?: () => void;
  reverseLookupResults?: ReverseLookupResults;
  initialFilterValues?: Record<string, string>;
  hideIdColumn?: boolean;
  canConfigureColumns?: boolean;
  onToggleIdColumn?: (hidden: boolean) => Promise<void> | void;
  onToggleFieldVisibility?: (field: Field, hidden: boolean) => Promise<void> | void;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
}

type FileMetadata = {
  bucket: string;
  path: string;
  name: string;
  mimeType: string;
  size: number;
};

type EditingCell = {
  recordId: string;
  fieldName: string;
};

const BASIC_INLINE_TYPES = new Set(["TEXT", "NUMBER", "BOOLEAN", "DATE", "ENUM"]);

function isFieldHidden(field: Field) {
  return Boolean((field.config?.value as { hidden?: boolean } | undefined)?.hidden);
}

const RelationCell = React.memo(
  ({
    field,
    value,
    relationLoading,
    relationOptions,
    fetchOptionsByIds,
  }: {
    field: Field;
    value: unknown;
    relationLoading: Record<string, boolean>;
    relationOptions: Record<string, RelationOption[]>;
    fetchOptionsByIds: (field: Field, ids: string[]) => Promise<void>;
  }) => {
    const items = Array.isArray(value) ? value : value ? [value] : [];
    const [previewTarget, setPreviewTarget] = useState<RelatedRecordSummary | null>(null);
    if (items.length === 0) return <span className="text-muted opacity-40">—</span>;

    const options = relationOptions[field.name] || [];
    const isLoading = relationLoading[field.name];
    const targetCollectionId =
      ((field.config?.value as { targetCollectionId?: string } | undefined)?.targetCollectionId as
        | string
        | undefined) ?? "";

    const handleOpenChange = (open: boolean) => {
      // Only fetch if we have raw IDs (strings)
      const hasRawIds = items.some((item) => typeof item === "string");
      if (open && hasRawIds) {
        const rawIds = items.filter((item): item is string => typeof item === "string");
        void fetchOptionsByIds(field, rawIds);
      }
    };

    const noun = items.length === 1 ? "Relación" : "Relaciones";

    return (
      <Popover onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Badge
            variant="outline"
            className="text-[10px] py-0.5 h-6 border-border/40 font-normal bg-surface/50 text-muted cursor-pointer hover:bg-surface-hover hover:text-foreground transition-all group"
          >
            <span className="mr-1.5 opacity-40 group-hover:opacity-100 transition-opacity">🔗</span>
            {items.length} {noun}
          </Badge>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[280px] p-2 bg-surface/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-xl z-50"
        >
          <div className="flex justify-between items-center mb-2 px-2">
            <div className="text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
              {items.length} {noun}
            </div>
            {isLoading && <Loader2 size={12} className="animate-spin text-primary" />}
          </div>

          <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto px-1 -mx-1 custom-scrollbar">
            {!isLoading ? (
              items.map((item, idx) => {
                let id: string;
                let label: string;

                if (typeof item === "object" && item !== null) {
                  const obj = item as Record<string, unknown>;
                  id = String(obj.id);
                  label = String(obj.displayName || obj.name || obj.label || obj.id);
                } else {
                  id = String(item);
                  label = options.find((o) => o.id === id)?.label || id;
                }

                return (
                  <button
                    key={`${id}-${idx}`}
                    type="button"
                    onClick={() =>
                      targetCollectionId &&
                      setPreviewTarget({
                        id,
                        label,
                        collectionId: targetCollectionId,
                        collectionName: "",
                      })
                    }
                    className="w-full text-xs text-foreground/80 truncate py-1.5 px-2 rounded-lg hover:bg-background/80 transition-colors border border-transparent hover:border-border/30 text-left"
                  >
                    {String(label)}
                  </button>
                );
              })
            ) : (
              <div className="text-xs text-muted italic px-2 py-1">Cargando vinculación...</div>
            )}
          </div>

          <RecordQuickViewDialog
            open={previewTarget !== null}
            onOpenChange={(open) => !open && setPreviewTarget(null)}
            target={previewTarget}
          />
        </PopoverContent>
      </Popover>
    );
  },
);
RelationCell.displayName = "RelationCell";

const RelationFilterInput = ({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string;
  onChange: (val: string) => void;
}) => {
  const { options, loading, searchRelations, fetchOptionsByIds } = useRelationRecords();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const fieldOptions = useMemo(() => options[field.name] || [], [options, field.name]);
  const isLoading = loading[field.name];

  // Resolve initial label if value exists but no options
  useEffect(() => {
    if (value && !fieldOptions.find((o) => o.id === value)) {
      void fetchOptionsByIds(field, [value]);
    }
  }, [value, field, fetchOptionsByIds, fieldOptions]);

  const handleSearch = (q: string) => {
    setQuery(q);
    void searchRelations(field, q);
  };

  const selectedLabel = fieldOptions.find((o) => o.id === value)?.label || value;

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={12}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted opacity-50"
        />
        <Input
          value={isOpen ? query : value ? selectedLabel : query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            setIsOpen(true);
            void searchRelations(field, query);
          }}
          placeholder="Buscar relación..."
          className="h-8 pl-8 text-xs bg-background border-border/20 focus:ring-1 focus:ring-primary/30"
        />
        {value && !isOpen && (
          <button
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-red-400"
          >
            <ChevronDown size={12} className="rotate-45" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 border border-border/20 bg-background/40 rounded-lg max-h-40 overflow-y-auto py-1 animate-in fade-in slide-in-from-top-1 duration-200 shadow-inner">
          {isLoading && (
            <div className="px-3 py-2 text-[10px] text-muted flex items-center gap-2">
              <Loader2 size={10} className="animate-spin" />
              Buscando registros...
            </div>
          )}
          {!isLoading && fieldOptions.length === 0 && (
            <div className="px-3 py-2 text-[10px] text-muted italic">
              No se encontraron resultados
            </div>
          )}
          {fieldOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                onChange(opt.id);
                setQuery("");
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[11px] transition-colors flex items-center justify-between",
                value === opt.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground/70 hover:bg-surface-hover/30 hover:text-foreground",
              )}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.id && <Plus size={10} className="rotate-45" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export function DataGrid({
  collectionId,
  fields,
  records,
  total,
  currentPage,
  pageSize,
  sortField,
  sortDirection,
  search,
  onSearchChange,
  onFiltersChange,
  onPageChange,
  onSort,
  onInlineEdit,
  onEdit,
  onDelete,
  onAddRecord,
  reverseLookupResults = {},
  initialFilterValues,
  hideIdColumn = false,
  canConfigureColumns = false,
  onToggleIdColumn,
  onToggleFieldVisibility,
  canCreate = true,
  canRead = true,
  canUpdate = true,
  canDelete = true,
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Record<string, boolean>>({});
  const [draftValue, setDraftValue] = useState<string>("");
  const [updatingCell, setUpdatingCell] = useState(false);
  const [documentRecordId, setDocumentRecordId] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(
    initialFilterValues || {},
  );

  // Sync initial filter values if they change or the grid mounts
  useEffect(() => {
    setFilterValues(initialFilterValues || {});
  }, [initialFilterValues]);

  // Relation resolution
  const {
    options: relationOptions,
    loading: relationLoading,
    fetchOptionsByIds,
  } = useRelationRecords();
  const { downloadFile } = useStorage();

  const totalPages = Math.ceil(total / pageSize);
  const visibleFields = useMemo(() => fields.filter((field) => !isFieldHidden(field)), [fields]);

  // Debounced effect for multiple filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const updated = Object.entries(filterValues)
        .filter(([, v]) => v.trim() !== "")
        .map(([name, val]) => {
          const f = visibleFields.find((i) => i.name === name);
          const type = f?.fieldType.value;

          let operator: ColumnFilter["operator"] = "contains";
          let value: unknown = val;

          if (type === "NUMBER") {
            operator = "eq";
            value = Number(val);
          } else if (type === "BOOLEAN" || type === "ENUM") {
            operator = "eq";
            value = val;
          } else if (type === "RELATION") {
            // Relaciones usan 'contains' para buscar dentro de strings o arreglos stringificados
            operator = "contains";
            value = val;
          }

          return { field: name, operator, value };
        });

      // Only notify parent if values actually differ or it's the first run
      onFiltersChange(updated as ColumnFilter[], filterValues);
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [filterValues, visibleFields, onFiltersChange]);

  const activeFilters = useMemo(() => {
    const nextFilters: ColumnFilter[] = [];

    for (const field of visibleFields) {
      const rawValue = filterValues[field.name];
      if (!rawValue || rawValue.trim() === "") continue;

      if (field.fieldType.value === "NUMBER") {
        nextFilters.push({
          field: field.name,
          operator: "eq",
          value: Number(rawValue),
        });
      } else if (field.fieldType.value === "BOOLEAN" || field.fieldType.value === "ENUM") {
        nextFilters.push({
          field: field.name,
          operator: "eq",
          value: rawValue,
        });
      } else {
        nextFilters.push({
          field: field.name,
          operator: "contains",
          value: rawValue,
        });
      }
    }

    return nextFilters;
  }, [visibleFields, filterValues]);

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      onSort(fieldName, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSort(fieldName, "asc");
    }
  };

  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) return <ChevronUp className="h-4 w-4 opacity-20" />;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const startInlineEdit = (record: DataRecord, field: Field) => {
    if (!BASIC_INLINE_TYPES.has(field.fieldType.value)) return;

    const value = record.data[field.name];
    setEditingCell({ recordId: record.id, fieldName: field.name });
    setDraftValue(value === undefined || value === null ? "" : String(value));
  };

  const parseInlineValue = (field: Field, value: string) => {
    switch (field.fieldType.value) {
      case "NUMBER":
        return value === "" ? null : Number(value);
      case "BOOLEAN":
        return value === "true";
      default:
        return value;
    }
  };

  const commitInlineEdit = async (record: DataRecord, field: Field) => {
    if (!editingCell) return;
    setUpdatingCell(true);
    try {
      await onInlineEdit(record, field, parseInlineValue(field, draftValue));
      setEditingCell(null);
      setDraftValue("");
    } finally {
      setUpdatingCell(false);
    }
  };

  const handleExport = () => {
    if (records.length === 0) return;

    const headers = [
      ...(!hideIdColumn ? ["ID"] : []),
      ...visibleFields.map((field) => field.displayName || field.name),
    ].join(",");
    const rows = records
      .map((record) => {
        return [
          ...(!hideIdColumn ? [`"${formatShortRecordId(record.id)}"`] : []),
          ...visibleFields.map((field) => {
            const rawValue = record.data[field.name];
            let cellValue = "";

            if (rawValue !== undefined && rawValue !== null) {
              if (typeof rawValue === "object") {
                cellValue = JSON.stringify(rawValue);
              } else {
                cellValue = String(rawValue);
              }
            }

            return `"${cellValue.replace(/"/g, '""')}"`;
          }),
        ].join(",");
      })
      .join("\n");

    const csvContent = "\uFEFF" + headers + "\n" + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadFile = async (file: FileMetadata) => {
    if (!file?.path || !file?.bucket) return;
    setDownloadingFiles((prev) => ({ ...prev, [file.path]: true }));

    try {
      const res = await downloadFile(file.bucket, file.path);

      if (res.ok && res.value) {
        const url = URL.createObjectURL(res.value);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name || "archivo";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setDownloadingFiles((prev) => ({ ...prev, [file.path]: false }));
    }
  };

  const renderCellValue = (record: DataRecord, field: Field) => {
    let value = record.data[field.name];

    if (field.fieldType.value === "REVERSE_LOOKUP") {
      value = reverseLookupResults?.[record.id]?.[field.name];
    }

    const isEditing = editingCell?.recordId === record.id && editingCell?.fieldName === field.name;

    if (isEditing) {
      if (field.fieldType.value === "ENUM") {
        const options = (field.config?.value as { options?: string[] } | undefined)?.options ?? [];
        return (
          <Select
            value={draftValue}
            onValueChange={(val) => {
              setDraftValue(val);
              void commitInlineEdit(record, field);
            }}
          >
            <SelectTrigger className="h-8 bg-background border-border text-foreground">
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border text-foreground">
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      if (field.fieldType.value === "BOOLEAN") {
        return (
          <Select
            value={draftValue === "" ? "false" : draftValue}
            onValueChange={(val) => {
              setDraftValue(val);
              void commitInlineEdit(record, field);
            }}
          >
            <SelectTrigger className="h-8 bg-background border-border text-foreground">
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-border text-foreground">
              <SelectItem value="true">Sí</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        );
      }

      return (
        <Input
          autoFocus
          className="h-8 bg-background border-border text-foreground"
          type={
            field.fieldType.value === "NUMBER"
              ? "number"
              : field.fieldType.value === "DATE"
                ? "date"
                : "text"
          }
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={() => void commitInlineEdit(record, field)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void commitInlineEdit(record, field);
            }
            if (event.key === "Escape") {
              setEditingCell(null);
              setDraftValue("");
            }
          }}
          disabled={updatingCell}
        />
      );
    }

    if (value === undefined || value === null || value === "") {
      return <span className="text-zinc-700">—</span>;
    }

    switch (field.fieldType.value) {
      case "BOOLEAN":
        return (
          <Badge
            variant="outline"
            className={
              value ? "text-primary border-primary/20 bg-primary/5" : "text-muted border-border"
            }
          >
            {value ? "Sí" : "No"}
          </Badge>
        );
      case "DATE":
        return (
          <span className="text-foreground/80">
            {new Date(value as string).toLocaleDateString()}
          </span>
        );
      case "ENUM":
        return (
          <Badge variant="secondary" className="font-normal">
            {String(value)}
          </Badge>
        );
      case "NUMBER":
        return <span className="font-mono text-foreground/80">{String(value)}</span>;
      case "FILE":
        const file = value as FileMetadata;
        const isDownloading = downloadingFiles[file.path];
        return (
          <button
            onClick={() => !isDownloading && handleDownloadFile(file)}
            disabled={isDownloading}
            className={cn(
              "flex items-center gap-1.5 group text-left transition-opacity",
              isDownloading ? "opacity-50 cursor-wait" : "hover:opacity-80",
            )}
          >
            <span
              className={cn(
                "text-xs font-medium truncate max-w-[140px] underline decoration-border/40 hover:decoration-primary transition-all",
                isDownloading ? "text-primary decoration-primary" : "text-foreground/80",
              )}
            >
              {file.name || "Archivo"}
            </span>
            {isDownloading ? (
              <Loader2 size={10} className="animate-spin text-primary shrink-0" />
            ) : (
              <Download
                size={10}
                className="text-muted opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0"
              />
            )}
          </button>
        );
      case "IMAGE": {
        const image = value as FileMetadata;
        const isDownloading = downloadingFiles[image.path];
        return (
          <button
            onClick={() => !isDownloading && handleDownloadFile(image)}
            disabled={isDownloading}
            className={cn(
              "flex items-center gap-1.5 group text-left transition-opacity",
              isDownloading ? "opacity-50 cursor-wait" : "hover:opacity-80",
            )}
          >
            <span className="text-[10px] text-primary/70">IMG</span>
            <span
              className={cn(
                "text-xs font-medium truncate max-w-[140px] underline decoration-border/40 hover:decoration-primary transition-all",
                isDownloading ? "text-primary decoration-primary" : "text-foreground/80",
              )}
            >
              {image.name || "Imagen"}
            </span>
            {isDownloading ? (
              <Loader2 size={10} className="animate-spin text-primary shrink-0" />
            ) : (
              <Download
                size={10}
                className="text-muted opacity-40 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0"
              />
            )}
          </button>
        );
      }
      case "LOCATION": {
        const loc = value as { lat: number; lng: number };
        return (
          <span className="text-foreground/80 text-xs">{`${String(loc.lat)}, ${String(loc.lng)}`}</span>
        );
      }
      case "RELATION":
      case "REVERSE_LOOKUP":
        return (
          <RelationCell
            field={field}
            value={value}
            relationLoading={relationLoading}
            relationOptions={relationOptions}
            fetchOptionsByIds={fetchOptionsByIds}
          />
        );
      default:
        return <span className="text-foreground/80">{String(value)}</span>;
    }
  };

  return (
    <div className="animate-in fade-in duration-500 px-8 pb-4">
      <div className="py-4 border-b border-border/10 bg-surface/30">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={search || ""}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-10 pl-10 bg-surface-hover/30 border-border/20 text-sm focus:ring-1 focus:ring-primary/20 focus:border-primary/30 transition-all rounded-lg"
              placeholder="Buscar registros..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  data-guidance-anchor="records-filters"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-10 px-4 border-border/20 bg-background/50 text-xs font-medium transition-all hover:bg-surface-hover/30",
                    activeFilters.length > 0 && "border-primary/20 bg-primary/5 text-primary",
                  )}
                >
                  <ListFilter size={14} className="mr-2" />
                  Filtros
                  {activeFilters.length > 0 && (
                    <span className="ml-2 bg-primary text-background px-1.5 py-0.5 rounded-full text-[10px] leading-none font-bold">
                      {activeFilters.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[420px] p-0 overflow-hidden bg-surface border-border/50 shadow-2xl"
                align="end"
              >
                <div className="px-4 py-3 border-b border-border/20 bg-surface-hover/10 flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Configurar Filtros
                  </h3>
                  {activeFilters.length > 0 && (
                    <button
                      onClick={() => {
                        setFilterValues({});
                        onFiltersChange([], {});
                      }}
                      className="text-[10px] uppercase font-bold text-primary hover:underline"
                    >
                      Limpiar todo
                    </button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                  {visibleFields.map((field) => {
                    const isActive = filterValues[field.name] !== undefined;
                    return (
                      <div
                        key={field.id}
                        className={cn(
                          "flex flex-col gap-2 p-3 rounded-lg transition-colors border border-transparent",
                          isActive
                            ? "bg-surface-hover/20 border-border/10"
                            : "hover:bg-surface-hover/10",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-foreground/70 uppercase tracking-tight">
                            {field.displayName || field.name}
                          </span>
                          {!isActive ? (
                            <button
                              onClick={() => setFilterValues({ ...filterValues, [field.name]: "" })}
                              className="text-[10px] text-muted hover:text-primary transition-colors flex items-center gap-1"
                            >
                              <Plus size={10} /> Añadir
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const next = { ...filterValues };
                                delete next[field.name];
                                setFilterValues(next);
                                // Update logic
                                const updated = Object.entries(next).map(([name, val]) => {
                                  const f = visibleFields.find((i) => i.name === name);
                                  const operator =
                                    f?.fieldType.value === "NUMBER" ||
                                    f?.fieldType.value === "BOOLEAN" ||
                                    f?.fieldType.value === "ENUM"
                                      ? "eq"
                                      : "contains";
                                  const value = f?.fieldType.value === "NUMBER" ? Number(val) : val;
                                  return { field: name, operator, value };
                                });
                                onFiltersChange(updated as ColumnFilter[], next);
                              }}
                              className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>

                        {isActive && (
                          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            {field.fieldType.value === "RELATION" ? (
                              <RelationFilterInput
                                field={field}
                                value={filterValues[field.name]}
                                onChange={(val) =>
                                  setFilterValues({ ...filterValues, [field.name]: val })
                                }
                              />
                            ) : (
                              <Input
                                autoFocus
                                value={filterValues[field.name]}
                                placeholder={`Filtrar ${field.displayName || field.name}...`}
                                className="h-8 text-xs bg-background border-border/20 focus:ring-1 focus:ring-primary/30"
                                onChange={(event) => {
                                  setFilterValues({
                                    ...filterValues,
                                    [field.name]: event.target.value,
                                  });
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {activeFilters.length > 0 && (
                  <div className="p-3 border-t border-border/10 bg-background/30 flex items-center justify-between">
                    <span className="text-[10px] text-muted uppercase font-medium tracking-tight">
                      Activo: {activeFilters.length} filtros
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] text-primary font-bold uppercase transition-transform active:scale-95"
                      onClick={() => {
                        // Trigger immediate sync if needed
                        setFilterValues({ ...filterValues });
                      }}
                    >
                      Actualizado
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {canConfigureColumns && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 border-border/20 bg-background/50 text-xs font-medium transition-all hover:bg-surface-hover/30"
                  >
                    <Columns3 size={14} className="mr-2" />
                    Columnas
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[320px] p-0 overflow-hidden bg-surface border-border/50 shadow-2xl"
                  align="end"
                >
                  <div className="px-4 py-3 border-b border-border/20 bg-surface-hover/10">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      Columnas visibles
                    </h3>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto p-2 space-y-1">
                    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-hover/10">
                      <div>
                        <p className="text-sm font-medium text-foreground">ID</p>
                        <p className="text-[11px] text-muted">Identificador corto del registro</p>
                      </div>
                      <Switch
                        aria-label="Mostrar columna ID"
                        checked={!hideIdColumn}
                        onCheckedChange={(checked) => void onToggleIdColumn?.(!checked)}
                      />
                    </div>
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-hover/10"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {field.displayName || field.name}
                          </p>
                          <p className="text-[11px] text-muted">{field.fieldType.value}</p>
                        </div>
                        <Switch
                          aria-label={`Mostrar columna ${field.displayName || field.name}`}
                          checked={!isFieldHidden(field)}
                          onCheckedChange={(checked) =>
                            void onToggleFieldVisibility?.(field, !checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <Button
              data-guidance-anchor="records-export"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={records.length === 0}
              className="h-10 px-4 border-border/20 bg-background/50 text-xs font-medium transition-all hover:bg-surface-hover/30 text-muted hover:text-foreground"
            >
              <Download size={14} className="mr-2" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Exp</span>
            </Button>

            {onAddRecord && canCreate && (
              <Button
                data-guidance-anchor="new-record"
                size="sm"
                className="h-10 bg-primary text-background hover:bg-primary/90 shadow-sm transition-all hover:-translate-y-0.5 active:translate-y-0 px-4"
                onClick={onAddRecord}
              >
                <Plus size={16} className="mr-2" />
                <span className="hidden sm:inline">Nuevo Registro</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border/5 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {!hideIdColumn && (
                <TableHead
                  className="cursor-pointer select-none py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-foreground transition-colors"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center gap-2">
                    ID
                    {getSortIcon("id")}
                  </div>
                </TableHead>
              )}
              {visibleFields.map((field) => (
                <TableHead
                  key={field.id}
                  className="cursor-pointer select-none py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted hover:text-foreground transition-colors"
                  onClick={() => handleSort(field.name)}
                >
                  <div className="flex items-center gap-2">
                    {field.displayName || field.name}
                    {getSortIcon(field.name)}
                  </div>
                </TableHead>
              ))}
              <TableHead
                data-guidance-anchor="record-document"
                className="w-[100px] text-right py-4 px-4 text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleFields.length + (!hideIdColumn ? 2 : 1)}
                  className="h-48 text-center text-muted font-light italic"
                >
                  No hay registros en esta colección.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow
                  key={record.id}
                  className="group border-b border-border/5 hover:bg-surface-hover/30 transition-colors"
                >
                  {!hideIdColumn && (
                    <TableCell className="py-4 px-4 font-mono text-xs text-foreground/70">
                      {formatShortRecordId(record.id)}
                    </TableCell>
                  )}
                  {visibleFields.map((field) => (
                    <TableCell
                      key={field.id}
                      className={`py-4 px-4 font-normal text-sm ${
                        BASIC_INLINE_TYPES.has(field.fieldType.value) ? "cursor-pointer" : ""
                      }`}
                      onDoubleClick={() => startInlineEdit(record, field)}
                    >
                      {renderCellValue(record, field)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right py-3 px-4" data-testid="actions-cell">
                    {(canRead || canUpdate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid="row-actions"
                            aria-label={`Acciones para registro ${record.id}`}
                            className="h-8 w-8 text-muted hover:text-foreground hover:bg-surface-hover transition-all cursor-pointer"
                          >
                            <MoreHorizontal size={14} />
                            <span className="sr-only">Acciones para registro {record.id}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 bg-surface border-border/50"
                        >
                          {collectionId && canRead && (
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/collections/${collectionId}/records/${record.id}`}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Eye size={14} className="text-muted" />
                                <span>Ver detalle</span>
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (
                            <DropdownMenuItem
                              onClick={() => onEdit(record as DataRecord)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Edit2 size={14} className="text-muted" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                          )}
                          {collectionId && canRead && (
                            <DropdownMenuItem
                              onClick={() => setDocumentRecordId(record.id)}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <FileText size={14} className="text-muted" />
                              <span>Documento</span>
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator className="bg-border/10" />
                              <DropdownMenuItem
                                onClick={() => onDelete(record.id)}
                                className="flex items-center gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                              >
                                <Trash2 size={14} />
                                <span>Eliminar</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {collectionId && (
        <RecordDocumentSelectorModal
          isOpen={!!documentRecordId}
          onOpenChange={(open) => !open && setDocumentRecordId(null)}
          collectionId={collectionId}
          recordId={documentRecordId}
        />
      )}

      {total > pageSize && (
        <div className="flex items-center justify-between py-6 px-4">
          <p className="text-xs text-muted font-light">
            Mostrando{" "}
            <span className="text-foreground font-medium">{(currentPage - 1) * pageSize + 1}</span>{" "}
            a{" "}
            <span className="text-foreground font-medium">
              {Math.min(currentPage * pageSize, total)}
            </span>{" "}
            de <span className="text-foreground font-medium">{total}</span> registros
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>Página</span>
              <span className="text-foreground font-mono font-medium">
                {currentPage} / {totalPages}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 border-border/10 bg-surface/50 text-muted hover:text-foreground"
                disabled={currentPage === 1}
                onClick={() => onPageChange(currentPage - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 border-border/10 bg-surface/50 text-muted hover:text-foreground"
                disabled={currentPage === totalPages}
                onClick={() => onPageChange(currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
