"use client";

import { ArrowLeft, FileText, Loader2, PencilLine, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { RecordDocumentSelectorModal } from "@/modules/document/presentation/components/record-document-selector-modal";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { Badge } from "@/shared/presentation/components/ui/badge";
import { Button } from "@/shared/presentation/components/ui/button";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import {
  formatShortRecordId,
  resolveRecordLabel,
} from "../../domain/services/record-label.service";
import { ReadOnlyFieldValue } from "../components/read-only-field-value";
import { RecordEditorForm } from "../components/record-editor-form";
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
  const { supabase } = useSupabase();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { collections } = useCollections();
  const { fields, loading: loadingFields } = useFields(collectionId);
  const updateRecordUseCase = useMemo(
    () => CollectionUseCaseFactory.create(supabase).updateRecord(),
    [supabase],
  );
  const eagerOptions = useMemo(() => ({ depth: 1 }), []);
  const { record, loading, error, refresh } = useEagerRecord(collectionId, recordId, eagerOptions);
  const [previewTarget, setPreviewTarget] = useState<RelatedRecordSummary | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDocumentSelectorOpen, setIsDocumentSelectorOpen] = useState(false);

  const collection = collections.find((item) => item.id === collectionId);
  const resolvedCollectionName = collection?.displayName || collection?.name || collectionName;
  const canRead = can(collectionId, "read");
  const canUpdate = can(collectionId, "update");
  const recordLabel = record
    ? resolveRecordLabel(record, collection?.primaryFieldName)
    : formatShortRecordId(recordId);

  useBreadcrumbs([
    { label: "Colecciones", href: "/collections" },
    { label: resolvedCollectionName, href: `/collections/${collectionId}` },
    { label: recordLabel },
  ]);

  const orderedFields = useMemo(() => fields, [fields]);

  const handleRecordUpdate = async (data: Record<string, unknown>) => {
    if (!currentWorkspace) {
      return { ok: false as const, error: { message: "No hay workspace activo." } };
    }

    const result = await updateRecordUseCase.execute({
      id: recordId,
      collectionId,
      accountId: currentWorkspace.id,
      data,
      userId: user?.id,
    });

    if (result.ok) {
      await refresh();
      setIsEditing(false);
      return { ok: true as const };
    }

    return {
      ok: false as const,
      error: { message: result.error.message },
    };
  };

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
            <div className="flex flex-wrap items-center justify-between gap-3">
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
              {!loading && !error && record && (canRead || canUpdate) && (
                <div className="flex items-center gap-2">
                  {canRead && (
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setIsDocumentSelectorOpen(true)}
                    >
                      <FileText size={14} />
                      Documentos
                    </Button>
                  )}
                  {canUpdate && (
                    <Button
                      type="button"
                      variant={isEditing ? "outline" : "default"}
                      size="icon"
                      aria-label={isEditing ? "Volver a vista" : "Editar en línea"}
                      onClick={() => setIsEditing((prev) => !prev)}
                    >
                      <PencilLine size={14} />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <h1 className="text-[2rem] md:text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">
              {recordLabel}
            </h1>
            <p className="text-sm text-foreground/65">
              {isEditing
                ? "Edita los campos del registro sin salir de esta vista en "
                : "Vista de detalle del registro dentro de "}
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
          isEditing ? (
            <div className="rounded-2xl border border-border/10 bg-surface p-6 md:p-8">
              <RecordEditorForm
                fields={orderedFields}
                record={{ id: record.id, data: record.data }}
                onSubmit={handleRecordUpdate}
                onCancel={() => setIsEditing(false)}
                submitLabel="Guardar cambios"
                layout="inline"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-border/10 bg-surface p-6 md:p-8">
              <div className="grid gap-4">
                {orderedFields.map((field) => {
                  const relatedRecords =
                    field.fieldType.value === "RELATION" ||
                    field.fieldType.value === "REVERSE_LOOKUP"
                      ? toRelatedRecordSummaries(record.relations[field.name], collections)
                      : [];
                  const value =
                    field.fieldType.value === "RELATION" ||
                    field.fieldType.value === "REVERSE_LOOKUP"
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
          )
        ) : null}
      </div>

      <RecordQuickViewDialog
        open={previewTarget !== null}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
        target={previewTarget}
      />
      <RecordDocumentSelectorModal
        isOpen={isDocumentSelectorOpen}
        onOpenChange={setIsDocumentSelectorOpen}
        collectionId={collectionId}
        recordId={recordId}
      />
    </>
  );
}
