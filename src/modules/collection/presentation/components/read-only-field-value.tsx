"use client";

import { Eye } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";

import { Field } from "../../domain/entities/field.entity";
import { toRecordLabelValue } from "../../domain/services/record-label.service";
import { useStorage } from "../hooks/use-storage";
import { RelatedRecordSummary } from "../lib/record-relations";

type FileMetadata = {
  name?: string;
  path?: string;
  mimeType?: string;
  size?: number;
};

interface ReadOnlyFieldValueProps {
  field: Field;
  value: unknown;
  relatedRecords?: RelatedRecordSummary[];
  onOpenRecordPreview?: (record: RelatedRecordSummary) => void;
  emptyLabel?: string;
}

function isFileMetadata(value: unknown): value is FileMetadata {
  return typeof value === "object" && value !== null;
}

export function ReadOnlyFieldValue({
  field,
  value,
  relatedRecords = [],
  onOpenRecordPreview,
  emptyLabel = "—",
}: ReadOnlyFieldValueProps) {
  const emptyState = <span className="text-muted opacity-40">{emptyLabel}</span>;
  const isRelationField =
    field.fieldType.value === "RELATION" || field.fieldType.value === "REVERSE_LOOKUP";
  const { getPublicUrl } = useStorage();

  if (
    !isRelationField &&
    (value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0))
  ) {
    return emptyState;
  }

  switch (field.fieldType.value) {
    case "BOOLEAN":
      return (
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md min-h-5 whitespace-normal wrap-break-word",
            value ? "text-primary border-primary/20 bg-primary/5" : "text-muted border-border/50",
          )}
        >
          {value ? "Confirmado" : "Pendiente"}
        </Badge>
      );

    case "DATE":
      return (
        <span className="text-foreground/80">{new Date(String(value)).toLocaleDateString()}</span>
      );

    case "ENUM":
      return (
        <Badge
          variant="secondary"
          className="font-semibold text-xs bg-foreground/5 text-foreground/70 border-none px-2 py-1 rounded-lg uppercase tracking-wider whitespace-normal wrap-break-word"
        >
          {String(value)}
        </Badge>
      );

    case "NUMBER":
      return <span className="font-mono text-foreground/80">{String(value)}</span>;

    case "FILE":
    case "IMAGE": {
      if (!isFileMetadata(value) || !value.path) {
        return (
          <span className="text-foreground/80 font-medium italic opacity-40">Sin archivo</span>
        );
      }

      const handleView = () => {
        if (value.path) {
          const res = getPublicUrl("record_files", value.path);
          if (res.ok) {
            window.open(res.value, "_blank");
          }
        }
      };

      return (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 gap-2 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all duration-300 group"
          onClick={handleView}
        >
          <div className="flex flex-col items-start min-w-0">
            <span className="text-xs font-semibold truncate max-w-[150px]">
              {value.name || "Ver Documento"}
            </span>
            <span className="text-[9px] font-mono opacity-50 uppercase tracking-tighter">
              {value.mimeType?.split("/")[1] || "archivo"} • Ver
            </span>
          </div>
          <Eye size={14} className="group-hover:scale-110 transition-transform" />
        </Button>
      );
    }

    case "LOCATION": {
      const location = value as { lat?: number; lng?: number };
      if (location.lat === undefined || location.lng === undefined) {
        return emptyState;
      }

      return (
        <span className="text-foreground/80 text-xs">
          {`${String(location.lat)}, ${String(location.lng)}`}
        </span>
      );
    }

    case "RELATION":
    case "REVERSE_LOOKUP":
      if (relatedRecords.length === 0) {
        return emptyState;
      }

      return (
        <div className="flex flex-wrap gap-2">
          {relatedRecords.map((record) =>
            onOpenRecordPreview ? (
              <button
                key={record.id}
                type="button"
                onClick={() => onOpenRecordPreview(record)}
                className="max-w-full rounded-lg border border-border/40 bg-surface/60 px-2.5 py-1 text-left text-[13px] text-foreground/80 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-95"
              >
                <span className="font-medium wrap-break-word leading-tight">{record.label}</span>
              </button>
            ) : (
              <Badge
                key={record.id}
                variant="outline"
                className="max-w-full border-border/40 bg-surface/60 font-normal text-foreground/80"
              >
                <span className="font-normal whitespace-normal wrap-break-word">
                  {record.label}
                </span>
              </Badge>
            ),
          )}
        </div>
      );

    default: {
      const text = toRecordLabelValue(value);
      if (text.length > 0) {
        return <span className="text-foreground/80">{text}</span>;
      }

      return <span className="text-foreground/80">{String(value)}</span>;
    }
  }
}
