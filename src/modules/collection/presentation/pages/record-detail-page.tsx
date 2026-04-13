"use client";

import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import {
  formatShortRecordId,
  resolveRecordLabel,
} from "../../domain/services/record-label.service";
import { ReadOnlyFieldValue } from "../components/read-only-field-value";
import { RecordQuickViewDialog } from "../components/record-quick-view-dialog";
import { useCollections } from "../hooks/use-collections";
import { useEagerRecord } from "../hooks/use-eager-record";
import { useFields } from "../hooks/use-fields";
import { RelatedRecordSummary, toRelatedRecordSummaries } from "../lib/record-relations";

interface RecordDetailPageProps {
  collectionId: string;
  recordId: string;
  collectionName: string;
}

export function RecordDetailPage({
  collectionId,
  recordId,
  collectionName,
}: RecordDetailPageProps) {
  const { collections } = useCollections();
  const { fields, loading: loadingFields } = useFields(collectionId);
  const { record, loading, error, refresh } = useEagerRecord(collectionId, recordId, { depth: 2 });
  const [previewTarget, setPreviewTarget] = useState<RelatedRecordSummary | null>(null);

  const collection = collections.find((item) => item.id === collectionId);
  const resolvedCollectionName = collection?.displayName || collection?.name || collectionName;
  const recordLabel = record
    ? resolveRecordLabel(record, collection?.primaryFieldName)
    : formatShortRecordId(recordId);

  useBreadcrumbs([
    { label: "Colecciones", href: "/collections" },
    { label: resolvedCollectionName, href: `/collections/${collectionId}` },
    { label: recordLabel },
  ]);

  const orderedFields = useMemo(() => fields, [fields]);

  return (
    <>
      <div className="space-y-8 pb-16">
        <div className="space-y-4 px-2">
          <Button
            asChild
            variant="ghost"
            className="h-9 px-0 text-foreground/60 hover:bg-transparent hover:text-foreground"
          >
            <Link href={`/collections/${collectionId}`}>
              <ArrowLeft size={14} />
              Volver a la colección
            </Link>
          </Button>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/20 bg-primary/5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary"
              >
                Registro
              </Badge>
              <Badge
                variant="outline"
                className="border-border/40 bg-background/60 font-mono text-[10px] text-foreground/60"
              >
                {formatShortRecordId(recordId)}
              </Badge>
            </div>
            <h1 className="text-[2rem] md:text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
              {recordLabel}
            </h1>
            <p className="text-sm text-foreground/65">
              Vista de solo lectura del registro dentro de{" "}
              <span className="font-medium text-foreground">{resolvedCollectionName}</span>.
            </p>
          </div>
        </div>

        {loading || loadingFields ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl bg-surface">
            <Loader2 className="animate-spin text-primary" size={28} />
            <p className="text-sm text-muted-foreground">Cargando detalle del registro...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-6 text-sm text-red-500">
            <div className="flex items-center justify-between gap-4">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
                <RefreshCw size={14} />
                Reintentar
              </Button>
            </div>
          </div>
        ) : record ? (
          <div className="rounded-2xl border border-border/10 bg-surface p-6 md:p-8">
            <div className="grid gap-4">
              {orderedFields.map((field) => {
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
                    className="rounded-2xl border border-border/10 bg-background/50 px-5 py-4"
                  >
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/55">
                        {field.displayName || field.name}
                      </p>
                      <ReadOnlyFieldValue
                        field={field}
                        value={value}
                        relatedRecords={relatedRecords}
                        onOpenRecordPreview={setPreviewTarget}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <RecordQuickViewDialog
        open={previewTarget !== null}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
        target={previewTarget}
      />
    </>
  );
}
