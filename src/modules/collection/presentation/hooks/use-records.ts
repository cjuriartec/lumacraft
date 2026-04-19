import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { CollectionUseCaseFactory } from "../../application/collection-use-case.factory";
import { Field } from "../../domain/entities/field.entity";
import { DataRecord } from "../../domain/entities/record.entity";
import { ColumnFilter, PaginationOptions } from "../../domain/types/pagination.types";

export type ReverseLookupResults = Record<string, Record<string, { id: string; label: string }[]>>;

interface UseRecordsOptions {
  enabled?: boolean;
}

export function useRecords(collectionId: string, options: UseRecordsOptions = {}) {
  const { enabled = true } = options;
  const { supabase } = useSupabase();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [data, setData] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    pageSize: 25,
    sortField: "created_at",
    sortDirection: "desc",
    search: "",
    searchFields: [],
    filters: [],
  });

  // State for resolved reverse lookups: { [recordId]: { [fieldName]: DataRecord[] } }
  const [reverseLookupResults, setReverseLookupResults] = useState<ReverseLookupResults>({});

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);

  const listUseCase = useMemo(() => factory.listRecords(), [factory]);
  const getCollectionUseCase = useMemo(() => factory.getCollection(), [factory]);
  const createUseCase = useMemo(() => factory.createRecord(), [factory]);
  const updateUseCase = useMemo(() => factory.updateRecord(), [factory]);
  const deleteUseCase = useMemo(() => factory.deleteRecord(), [factory]);
  const resolveReverseLookupUseCase = useMemo(() => factory.resolveReverseLookup(), [factory]);

  const fetchRecords = useCallback(async () => {
    if (!enabled || !collectionId) {
      setData([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listUseCase.execute(collectionId, pagination);
    if (res.ok) {
      setData(res.value.data);
      setTotal(res.value.total);
    }
    setLoading(false);
  }, [collectionId, enabled, listUseCase, pagination]);

  const resolveLabel = (record: DataRecord, displayField?: string | null): string => {
    if (displayField && displayField !== "id" && record.data[displayField]) {
      return String(record.data[displayField]);
    }
    return record.id;
  };

  useEffect(() => {
    const initFetch = async () => {
      await fetchRecords();
    };
    initFetch();
  }, [fetchRecords]);

  const resolveReverseLookups = useCallback(
    async (fields: Field[]) => {
      if (data.length === 0) return;

      const reverseFields = fields.filter((f) => f.fieldType.value === "REVERSE_LOOKUP");
      if (reverseFields.length === 0) return;

      const recordIds = data.map((r) => r.id);
      const newResults: ReverseLookupResults = {};

      for (const field of reverseFields) {
        const config = field.config?.value as
          | { targetFieldId?: string; targetCollectionId?: string }
          | undefined;
        if (!config?.targetFieldId || !config?.targetCollectionId) continue;

        const res = await resolveReverseLookupUseCase.execute({
          targetFieldId: config.targetFieldId,
          targetCollectionId: config.targetCollectionId,
          sourceRecordIds: recordIds,
        });

        if (res.ok) {
          // Fetch target collection to get primary field for labels
          const collRes = await getCollectionUseCase.execute(config.targetCollectionId);
          const primaryField = collRes.ok ? collRes.value?.primaryFieldName : null;

          // res.value is Record<sourceId, DataRecord[]>
          Object.entries(res.value).forEach(([sourceId, records]) => {
            if (!newResults[sourceId]) newResults[sourceId] = {};
            newResults[sourceId][field.name] = records.map((record) => ({
              id: record.id,
              label: resolveLabel(record, primaryField),
            }));
          });
        }
      }

      setReverseLookupResults((prev) => ({ ...prev, ...newResults }));
    },
    [data, resolveReverseLookupUseCase, getCollectionUseCase],
  );

  const createRecord = async (recordData: Record<string, unknown>) => {
    if (!currentWorkspace) return;
    const res = await createUseCase.execute({
      collectionId,
      accountId: currentWorkspace.id,
      data: recordData,
      userId: user?.id,
    });
    if (res.ok) {
      await fetchRecords();
    }
    return res;
  };

  const updateRecord = async (id: string, recordData: Record<string, unknown>) => {
    if (!currentWorkspace) return;
    const res = await updateUseCase.execute({
      id,
      collectionId,
      accountId: currentWorkspace.id,
      data: recordData,
      userId: user?.id,
    });
    if (res.ok) {
      await fetchRecords();
    }
    return res;
  };

  const deleteRecord = async (id: string) => {
    const res = await deleteUseCase.execute(id);
    if (res.ok) {
      await fetchRecords();
    }
    return res;
  };

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const setSort = useCallback((field: string, direction: "asc" | "desc") => {
    setPagination((prev) => ({ ...prev, sortField: field, sortDirection: direction, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setPagination((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setSearchFields = useCallback((searchFields: string[]) => {
    setPagination((prev) => ({ ...prev, searchFields, page: 1 }));
  }, []);

  const setFilters = useCallback((filters: ColumnFilter[]) => {
    setPagination((prev) => ({ ...prev, filters, page: 1 }));
  }, []);

  return {
    records: data,
    total,
    loading,
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
    refresh: fetchRecords,
  };
}
