"use client";

import { FileText, LayoutGrid, ListFilter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { usePermissions } from "@/modules/authorization/presentation/providers/permission-provider";
import { useGuidance } from "@/modules/guidance/presentation/hooks/use-guidance";
import { useGuidancePage } from "@/modules/guidance/presentation/hooks/use-guidance-page";
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
const SEARCHABLE_FIELD_TYPES = new Set(["TEXT", "NUMBER", "ENUM", "URL", "EMAIL", "PHONE"]);

function resolveTab(raw: string | null, canManageSchema: boolean): CollectionTab {
  if (raw === "templates") return "templates";
  if (raw === "fields" && canManageSchema) return "fields";
  return "data";
}

function isFieldHidden(field: Field) {
  return Boolean((field.config?.value as { hidden?: boolean } | undefined)?.hidden);
}

export function CollectionDetailPage({ collectionId, collectionName }: CollectionDetailPageProps) {
  useBreadcrumbs([{ label: "Colecciones", href: "/collections" }, { label: collectionName }]);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackMilestone } = useGuidance();
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
    reorderFields,
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
  const visibleFields = useMemo(() => fields.filter((field) => !isFieldHidden(field)), [fields]);
  const visibleFieldNames = useMemo(
    () => new Set(visibleFields.map((field) => field.name)),
    [visibleFields],
  );

  const [recordEditorOpen, setRecordEditorOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DataRecord | undefined>(undefined);
  const [initialFilterValues, setInitialFilterValues] = useState<Record<string, string>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<CollectionTab>(
    resolveTab(searchParams.get("tab"), canManageSchema),
  );

  useGuidancePage({
    id:
      activeTab === "fields"
        ? "collection-fields"
        : activeTab === "templates"
          ? "collection-templates"
          : "collection-data",
  });

  useEffect(() => {
    async function hydrate() {
      const stored = await loadStoredFilters();
      if (stored) {
        const sanitizedRawValues = Object.fromEntries(
          Object.entries(stored.rawValues || {}).filter(([name]) => visibleFieldNames.has(name)),
        );
        const sanitizedFilters = (stored.filters || []).filter((filter) =>
          visibleFieldNames.has(filter.field),
        );

        setPagination((prev) => ({
          ...prev,
          filters: sanitizedFilters,
          search: stored.search || "",
        }));
        setInitialFilterValues(sanitizedRawValues);
      }
      setIsHydrated(true);
    }
    void hydrate();
  }, [loadStoredFilters, setPagination, visibleFieldNames]);

  useEffect(() => {
    setActiveTab(resolveTab(searchParams.get("tab"), canManageSchema));
  }, [searchParams, canManageSchema]);

  const handleFiltersChange = (filters: ColumnFilter[], rawValues: Record<string, string>) => {
    setInitialFilterValues(rawValues);
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
      const result = await createRecord(data);
      if (result?.ok) {
        void trackMilestone("record_created");
      }
      return result;
    }
  };

  useEffect(() => {
    const searchableFields = visibleFields
      .filter((field) => SEARCHABLE_FIELD_TYPES.has(field.fieldType.value))
      .map((field) => field.name);

    setSearchFields(searchableFields);
  }, [visibleFields, setSearchFields]);

  const handleInlineEdit = async (record: DataRecord, field: Field, value: unknown) => {
    await updateRecord(record.id, {
      ...record.data,
      [field.name]: value,
    });
  };

  const persistPrunedFilters = (
    hiddenFieldName: string,
    nextSearch: string = pagination.search || "",
  ) => {
    const nextRawValues = Object.fromEntries(
      Object.entries(initialFilterValues).filter(([name]) => name !== hiddenFieldName),
    );
    const nextFilters = (pagination.filters || []).filter(
      (filter) => filter.field !== hiddenFieldName,
    );

    setInitialFilterValues(nextRawValues);
    setFilters(nextFilters);
    persistFilters(nextFilters, nextRawValues, nextSearch);
  };

  const handleToggleIdColumn = async (hidden: boolean) => {
    if (!currentCollection) return;

    await updateCollection({
      ...currentCollection.toJSON(),
      settings: {
        ...currentCollection.settings,
        hideIdColumn: hidden,
      },
    });
  };

  const handleToggleFieldVisibility = async (field: Field, hidden: boolean) => {
    const result = await updateField({
      ...field.toJSON(),
      id: field.id,
      config: {
        ...(field.config?.value || {}),
        hidden,
      },
    });

    if (result.ok && hidden) {
      persistPrunedFilters(field.name);
    }
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
          <TabsTrigger
            value="data"
            className="flex items-center"
            data-guidance-anchor="collection-tab-data"
          >
            <LayoutGrid size={16} className="mr-2" />
            Datos{" "}
            {total > 0 && <span className="ml-2 text-[10px] opacity-40 font-mono">({total})</span>}
          </TabsTrigger>
          {canManageSchema && (
            <TabsTrigger
              value="fields"
              className="flex items-center"
              data-guidance-anchor="collection-tab-fields"
            >
              <ListFilter size={16} className="mr-2" />
              Esquema{" "}
              {fields.length > 0 && (
                <span className="ml-2 text-[10px] opacity-40 font-mono">({fields.length})</span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger
            value="templates"
            className="flex items-center"
            data-guidance-anchor="collection-tab-templates"
          >
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
                  hideIdColumn={currentCollection?.settings.hideIdColumn === true}
                  canConfigureColumns={canManageSchema}
                  onToggleIdColumn={handleToggleIdColumn}
                  onToggleFieldVisibility={handleToggleFieldVisibility}
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
                <div data-guidance-anchor="primary-field-select" className="w-full md:w-64">
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
                reorderFields={reorderFields}
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
