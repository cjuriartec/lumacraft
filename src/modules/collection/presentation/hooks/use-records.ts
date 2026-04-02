import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/modules/auth/presentation/providers/auth-provider";
import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { CollectionUseCaseFactory } from "../../application/collection-use-case.factory";
import { DataRecord } from "../../domain/entities/record.entity";
import { ColumnFilter, PaginationOptions } from "../../domain/types/pagination.types";

export function useRecords(collectionId: string) {
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

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);

  const listUseCase = useMemo(() => factory.listRecords(), [factory]);
  const createUseCase = useMemo(() => factory.createRecord(), [factory]);
  const updateUseCase = useMemo(() => factory.updateRecord(), [factory]);
  const deleteUseCase = useMemo(() => factory.deleteRecord(), [factory]);

  const fetchRecords = useCallback(async () => {
    if (!collectionId) {
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
  }, [collectionId, listUseCase, pagination]);

  useEffect(() => {
    const initFetch = async () => {
      await fetchRecords();
    };
    initFetch();
  }, [fetchRecords]);

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
