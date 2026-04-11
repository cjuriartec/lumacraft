"use client";

import { FileText, LayoutGrid, ListFilter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import TemplateListPage from "@/modules/template/presentation/pages/template-list-page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/presentation/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/presentation/components/ui/tabs";
import { useBreadcrumbs } from "@/shared/presentation/providers/breadcrumb-provider";

import { Field } from "../../domain/entities/field.entity";
import { DataRecord } from "../../domain/entities/record.entity";
import { ColumnFilter } from "../../domain/types/pagination.types";
import { DataGrid } from "../components/data-grid";
import { FieldManager } from "../components/field-manager";
import { RecordFormDialog } from "../components/record-form-dialog";
import { useCollections } from "../hooks/use-collections";
import { useFields } from "../hooks/use-fields";
import { useGridPersistence } from "../hooks/use-grid-persistence";
import { useRecords } from "../hooks/use-records";

interface CollectionDetailPageProps {
  collectionId: string;
  collectionName: string;
}

type CollectionTab = "data" | "fields" | "templates";

function resolveTab(raw: string | null, canManageSchema: boolean): CollectionTab {
  if (raw === "templates") return "templates";
  if (raw === "fields" && canManageSchema) return "fields";
  return "data";
}

export function CollectionDetailPage({ collectionId, collectionName }: CollectionDetailPageProps) {
  useBreadcrumbs([{ label: "Colecciones", href: "/collections" }, { label: collectionName }]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can, isOwner, isSuperAdmin } = usePermissions();
  const canRead = can(collectionId, "read");
  const canCreate = can(collectionId, "create");
  const canUpdate = can(collectionId, "update");
  const canDelete = can(collectionId, "delete");
  const canManageSchema = isOwner || isSuperAdmin;
  const {
    fields,
    loading: loadingFields,
    createField,
    updateField,
    deleteField,
  } = useFields(collectionId);
  const {
    records,
    total,
    pagination,
    reverseLookupResults,
    resolveReverseLookups,
    createRecord,
    updateRecord,
    deleteRecord,
    setPage,
    setSort,
    setSearch,
    setSearchFields,
    setFilters,
    setPagination,
  } = useRecords(collectionId);

  // ... (existing effects)

  // Resolve reverse lookups when records or fields are ready
  useEffect(() => {
    if (records.length > 0 && fields.length > 0) {
      void resolveReverseLookups(fields);
    }
  }, [records, fields, resolveReverseLookups]);
  const { collections, updateCollection } = useCollections();
  const { loadStoredFilters, persistFilters } = useGridPersistence(collectionId);

  const currentCollection = collections.find((c) => c.id === collectionId);

  const [recordEditorOpen, setRecordEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataRecord | undefined>(undefined);
  const [initialFilterValues, setInitialFilterValues] = useState<Record<string, string>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<CollectionTab>(
    resolveTab(searchParams.get("tab"), canManageSchema),
  );

  useEffect(() => {
    async function hydrate() {
      const stored = await loadStoredFilters();
      if (stored) {
        setPagination((prev) => ({
          ...prev,
          filters: stored.filters || [],
          search: stored.search || "",
        }));
        setInitialFilterValues(stored.rawValues || {});
      }
      setIsHydrated(true);
    }
    void hydrate();
  }, [loadStoredFilters, setPagination]);

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab"), canManageSchema));
  }, [searchParams, canManageSchema]);

  // Automatically sync searchFields with searchable field names
  useEffect(() => {
    if (fields.length > 0) {
      const searchableFields = fields
        .filter((f) =>
          ["TEXT", "NUMBER", "ENUM", "URL", "EMAIL", "PHONE"].includes(f.fieldType.value),
        )
        .map((f) => f.name);
      setSearchFields(searchableFields);
    }
  }, [fields, setSearchFields]);

  const handleFiltersChange = (filters: ColumnFilter[], rawValues: Record<string, string>) => {
    setFilters(filters);
    persistFilters(filters, rawValues, pagination.search || "");
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    persistFilters(pagination.filters || [], initialFilterValues, value);
  };

  const handleEditRecord = (record: DataRecord) => {
    setEditingRecord(record);
    setRecordEditorOpen(true);
  };

  const handleCreateRecord = () => {
    setEditingRecord(undefined);
    setRecordEditorOpen(true);
  };

  const handleRecordSubmit = async (data: Record<string, unknown>) => {
    if (editingRecord) {
      return await updateRecord(editingRecord.id, data);
    } else {
      return await createRecord(data);
    }
  };

  useEffect(() => {
    setSearchFields(fields.map((field) => field.name));
  }, [fields, setSearchFields]);

  const handleInlineEdit = async (record: DataRecord, field: Field, value: unknown) => {
    await updateRecord(record.id, {
      ...record.data,
      [field.name]: value,
    });
  };

  if (!isHydrated) return null;

  const handleTabChange = (value: string) => {
    const nextTab = resolveTab(value, canManageSchema);
    setActiveTab(nextTab);

    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextTab === "data") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-1 mb-8 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2 text-primary">
          Colección
        </p>
        <h1 className="text-[2rem] md:text-[2.5rem] font-bold leading-tight text-foreground tracking-[-0.02em]">
          {collectionName}
        </h1>
        <p className="text-sm font-light text-foreground/70 max-w-xl leading-relaxed">
          Administra registros y configura el esquema estructural para{" "}
          <span className="font-medium text-foreground">{collectionName}</span>.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" variant="line">
        <TabsList className="mb-8">
          <TabsTrigger value="data" className="flex items-center">
            <LayoutGrid size={16} className="mr-2" />
            Datos{" "}
            {total > 0 && <span className="ml-2 text-[10px] opacity-40 font-mono">({total})</span>}
          </TabsTrigger>
          {canManageSchema && (
            <TabsTrigger value="fields" className="flex items-center">
              <ListFilter size={16} className="mr-2" />
              Esquema{" "}
              {fields.length > 0 && (
                <span className="ml-2 text-[10px] opacity-40 font-mono">({fields.length})</span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="templates" className="flex items-center">
            <FileText size={16} className="mr-2" />
            Plantillas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-0 outline-none">
          {loadingFields ? (
            <div className="h-[400px] flex flex-col items-center justify-center gap-4 bg-surface rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
              <p className="text-muted text-xs font-light">Sincronizando esquema...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface overflow-hidden shadow-xs">
                <DataGrid
                  collectionId={collectionId}
                  fields={fields}
                  records={records}
                  total={total}
                  currentPage={pagination.page}
                  pageSize={pagination.pageSize}
                  sortField={pagination.sortField}
                  sortDirection={pagination.sortDirection}
                  search={pagination.search}
                  initialFilterValues={initialFilterValues}
                  onSearchChange={handleSearchChange}
                  onFiltersChange={handleFiltersChange}
                  onPageChange={setPage}
                  onSort={setSort}
                  onInlineEdit={handleInlineEdit}
                  onEdit={handleEditRecord}
                  onDelete={deleteRecord}
                  onAddRecord={handleCreateRecord}
                  reverseLookupResults={reverseLookupResults}
                  canCreate={canCreate}
                  canRead={canRead}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fields" className="mt-0 focus-visible:outline-none pb-12">
          <div className="space-y-6">
            {/* Collection Settings (Primary Field) */}
            <div className="rounded-2xl bg-surface border border-border/5 p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="max-w-md">
                  <h3 className="text-sm font-bold text-foreground mb-1">Campo Principal</h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Define qué campo se usará para representar estos registros cuando se creen
                    relaciones desde otras colecciones.
                  </p>
                </div>
                <div className="w-full md:w-64">
                  <Select
                    value={currentCollection?.primaryFieldName || "id"}
                    onValueChange={async (val: string) => {
                      if (currentCollection) {
                        await updateCollection({
                          ...currentCollection.toJSON(),
                          primaryFieldName: val === "id" ? null : val,
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="bg-surface-hover border-0 shadow-xs text-foreground">
                      <SelectValue placeholder="Seleccionar campo principal" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border text-foreground">
                      <SelectItem value="id">ID (Sistema)</SelectItem>
                      {fields.map((f) => (
                        <SelectItem key={f.id} value={f.name}>
                          {f.displayName || f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-surface border border-border/5 p-8">
              <FieldManager
                collectionId={collectionId}
                fields={fields}
                loading={loadingFields}
                createField={createField}
                updateField={updateField}
                deleteField={deleteField}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-0 focus-visible:outline-none pb-12">
          <TemplateListPage
            embedded
            collectionId={collectionId}
            collectionName={collectionName}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        </TabsContent>
      </Tabs>

      <RecordFormDialog
        open={recordEditorOpen}
        onOpenChange={setRecordEditorOpen}
        fields={fields}
        record={editingRecord}
        onSubmit={handleRecordSubmit}
      />
    </div>
  );
}
