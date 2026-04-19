"use client";

import { Clock3, ExternalLink, Rows3, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import { resolveRecordLabel } from "@/modules/collection/domain/services/record-label.service";
import { filterAccessibleCollections } from "@/shared/lib/workspace-access";
import { Button } from "@/shared/presentation/components/ui/button";
import { Input } from "@/shared/presentation/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/presentation/components/ui/table";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { Field } from "../../domain/entities/field.entity";
import { useWorkspaceRecords } from "../hooks/use-workspace-records";
import { useWorkspaceSchema } from "../hooks/use-workspace-schema";

const SEARCHABLE_FIELD_TYPES = new Set(["TEXT", "NUMBER", "ENUM", "URL", "EMAIL", "PHONE"]);

function buildSearchFieldsByCollection(
  collections: Array<{ id: string; primaryFieldName?: string | null }>,
  fields: Field[],
) {
  const result: Record<string, string[]> = {};

  for (const collection of collections) {
    const fieldNames = fields
      .filter(
        (field) =>
          field.collectionId === collection.id && SEARCHABLE_FIELD_TYPES.has(field.fieldType.value),
      )
      .map((field) => field.name);

    const primaryFieldName = collection.primaryFieldName;
    result[collection.id] = [
      ...new Set(
        primaryFieldName && primaryFieldName.length > 0
          ? [primaryFieldName, ...fieldNames]
          : fieldNames,
      ),
    ];
  }

  return result;
}

export default function WorkspaceRecordsPage() {
  const { collections, fields, loading: schemaLoading } = useWorkspaceSchema();
  const { can, isOwner, isSuperAdmin, loading: permissionsLoading } = usePermissions();

  useBreadcrumbs([{ label: "Registros" }]);

  const accessibleCollections = React.useMemo(
    () => filterAccessibleCollections(collections, isOwner || isSuperAdmin, can),
    [can, collections, isOwner, isSuperAdmin],
  );
  const accessibleCollectionIds = React.useMemo(
    () => accessibleCollections.map((collection) => collection.id),
    [accessibleCollections],
  );
  const searchFieldsByCollection = React.useMemo(
    () => buildSearchFieldsByCollection(accessibleCollections, fields),
    [accessibleCollections, fields],
  );
  const collectionById = React.useMemo(
    () => new Map(accessibleCollections.map((collection) => [collection.id, collection])),
    [accessibleCollections],
  );

  const {
    records,
    total,
    loading,
    pagination,
    selectedCollectionId,
    setSearch,
    setPage,
    setSelectedCollectionId,
  } = useWorkspaceRecords({
    collectionIds: accessibleCollectionIds,
    searchFieldsByCollection,
  });

  const totalPages =
    total === 0 || pagination.pageSize === 0 ? 0 : Math.ceil(total / pagination.pageSize);
  const isLoading = schemaLoading || permissionsLoading || loading;
  const hasAccessibleCollections = accessibleCollections.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
          Workspace
        </p>
        <h1 className="text-[2.5rem] font-bold tracking-[-0.02em] text-foreground">Registros</h1>
        <p className="max-w-2xl text-sm leading-6 text-foreground/70">
          Revisa en una sola vista los registros a los que tienes acceso y entra directo a su
          detalle o a la colección origen.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
          />
          <Input
            value={pagination.search ?? ""}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar registros..."
            className="h-11 rounded-xl border-border/40 bg-surface pl-10"
          />
        </div>
        <div className="w-full md:w-[240px]">
          <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
            <SelectTrigger className="h-11 rounded-xl border-border/40 bg-surface">
              <SelectValue placeholder="Filtrar por colección" />
            </SelectTrigger>
            <SelectContent className="border-border/50 bg-surface">
              <SelectItem value="all">Todas las colecciones</SelectItem>
              {accessibleCollections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.displayName || collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex h-11 items-center gap-2 rounded-xl border border-border/30 bg-surface/50 px-4 text-[13px] text-foreground/60">
          <Rows3 size={14} className="text-primary/70" />
          <b className="text-foreground">{total}</b>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border/10 bg-surface shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-primary" />
            <p className="text-xs font-light text-muted">Cargando registros...</p>
          </div>
        ) : !hasAccessibleCollections ? (
          <EmptyState
            title="Sin acceso a registros"
            description="No tienes colecciones accesibles para consultar registros en este workspace."
          />
        ) : records.length === 0 ? (
          <EmptyState
            title="Sin registros"
            description="No se encontraron registros con los filtros actuales."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/10 bg-surface-hover/30 hover:bg-surface-hover/30">
                  <TableHead className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">
                    Registro
                  </TableHead>
                  <TableHead className="py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">
                    Colección
                  </TableHead>
                  <TableHead className="py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">
                    Actualizado
                  </TableHead>
                  <TableHead className="px-6 py-4 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/60">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const collection = collectionById.get(record.collectionId);
                  const label = collection
                    ? resolveRecordLabel(record, collection.primaryFieldName)
                    : record.id.slice(0, 8);

                  return (
                    <TableRow
                      key={record.id}
                      className="border-b border-border/5 transition-colors hover:bg-surface-hover/30"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{label}</p>
                          <p className="text-[12px] font-light text-foreground/50">{record.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <span className="rounded border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary/75">
                          {collection ? collection.displayName || collection.name : "Colección"}
                        </span>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2 text-[12px] text-foreground/60">
                          <Clock3 size={12} className="opacity-50" />
                          <span>
                            {new Date(record.updatedAt).toLocaleDateString("es", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild className="rounded-lg">
                            <Link href={`/collections/${record.collectionId}/records/${record.id}`}>
                              Abrir
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="rounded-lg">
                            <Link href={`/collections/${record.collectionId}`}>
                              Colección
                              <ExternalLink size={14} />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/60">
            Página {pagination.page} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPage(pagination.page - 1)}
              className="rounded-lg"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages}
              onClick={() => setPage(pagination.page + 1)}
              className="rounded-lg"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Rows3 size={28} className="text-primary/50" />
      </div>
      <h3 className="mb-1 text-lg font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm font-light leading-6 text-foreground/55">{description}</p>
    </div>
  );
}
