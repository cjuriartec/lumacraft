"use client";

import { ArrowUpRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/presentation/components/ui/dialog";

import {
  formatShortRecordId,
  resolveRecordLabel,
} from "../../domain/services/record-label.service";
import { useCollections } from "../hooks/use-collections";
import { useEagerRecord } from "../hooks/use-eager-record";
import { useFields } from "../hooks/use-fields";
import { RelatedRecordSummary, toRelatedRecordSummaries } from "../lib/record-relations";
import { ReadOnlyFieldValue } from "./read-only-field-value";

interface RecordQuickViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: RelatedRecordSummary | null;
}

function hasDisplayValue(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export function RecordQuickViewDialog({ open, onOpenChange, target }: RecordQuickViewDialogProps) {
  const collectionId = target?.collectionId ?? "";
  const recordId = target?.id ?? "";
  const { collections } = useCollections();
  const { record, loading, error } = useEagerRecord(collectionId, recordId, {
    depth: 1,
    enabled: open && Boolean(target),
  });
  const { fields, loading: loadingFields } = useFields(collectionId);

  const collection = collections.find((item) => item.id === collectionId);
  const recordLabel = record
    ? resolveRecordLabel(record, collection?.primaryFieldName)
    : target?.label || formatShortRecordId(recordId);
  const relatedFields = useMemo(() => {
    if (!record) {
      return [];
    }

    return fields
      .filter((field) => {
        if (field.fieldType.value === "RELATION" || field.fieldType.value === "REVERSE_LOOKUP") {
          return toRelatedRecordSummaries(record.relations[field.name], collections).length > 0;
        }

        return hasDisplayValue(record.data[field.name]);
      })
      .slice(0, 5);
  }, [collections, fields, record]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border-border/40 bg-surface p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="border-b border-border/20 px-6 py-5 pr-14">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-primary/20 bg-primary/5 text-[10px] font-semibold uppercase tracking-widest text-primary px-1.5 h-4.5"
                >
                  Registro
                </Badge>
                <Badge
                  variant="outline"
                  className="border-border/40 bg-background/60 font-mono text-[10px] text-foreground/50 px-1.5 h-4.5"
                >
                  {formatShortRecordId(recordId)}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-semibold tracking-tight text-foreground leading-snug">
                {recordLabel}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-foreground/40 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="w-1 h-1 rounded-full bg-primary/40" />
                {record?.collectionName ||
                  target?.collectionName ||
                  collection?.displayName ||
                  "Colección"}
              </DialogDescription>
            </div>

            {target && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="shrink-0 h-9 rounded-xl border-border/50 hover:bg-surface-hover/50 hover:text-primary transition-all duration-300"
              >
                <Link
                  href={`/collections/${target.collectionId}/records/${target.id}`}
                  className="flex items-center gap-2"
                >
                  <span className="text-[12px] font-semibold">Ver registro</span>
                  <ArrowUpRight size={14} className="opacity-60" />
                </Link>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          {loading || loadingFields ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="animate-spin text-primary" size={22} />
              <p className="text-sm text-muted-foreground">Cargando vista rápida del registro...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-5 text-sm text-red-500">
              {error}
            </div>
          ) : record ? (
            <div className="space-y-4">
              {relatedFields.map((field) => {
                const relatedRecords =
                  field.fieldType.value === "RELATION" || field.fieldType.value === "REVERSE_LOOKUP"
                    ? toRelatedRecordSummaries(record.relations[field.name], collections)
                    : [];
                const value =
                  field.fieldType.value === "RELATION" || field.fieldType.value === "REVERSE_LOOKUP"
                    ? record.relations[field.name]
                    : record.data[field.name];

                return (
                  <div
                    key={field.id}
                    className="space-y-2 rounded-xl border border-border/10 bg-background/10 px-4 py-3 hover:border-border/20 transition-all"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                      {field.displayName || field.name}
                    </p>
                    <div className="text-sm">
                      <ReadOnlyFieldValue
                        field={field}
                        value={value}
                        relatedRecords={relatedRecords}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/20 bg-background/40 px-4 py-5 text-sm text-muted-foreground">
              No fue posible cargar este registro.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
