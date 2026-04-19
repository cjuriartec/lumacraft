"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { CollectionUseCaseFactory } from "../../application/collection-use-case.factory";
import { DataRecord } from "../../domain/entities/record.entity";
import { PaginationOptions } from "../../domain/types/pagination.types";

interface UseWorkspaceRecordsParams {
  collectionIds: string[];
  searchFieldsByCollection: Record<string, string[]>;
}

export function useWorkspaceRecords({
  collectionIds,
  searchFieldsByCollection,
}: UseWorkspaceRecordsParams) {
  const { currentWorkspace } = useWorkspace();
  const { supabase } = useSupabase();
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [selectedCollectionIdState, setSelectedCollectionId] = useState<string>("all");
  const selectedCollectionId = useMemo(() => {
    if (selectedCollectionIdState !== "all" && !collectionIds.includes(selectedCollectionIdState)) {
      return "all";
    }
    return selectedCollectionIdState;
  }, [collectionIds, selectedCollectionIdState]);
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    pageSize: 20,
    sortField: "updated_at",
    sortDirection: "desc",
    search: "",
  });

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);
  const listWorkspaceRecordsUseCase = useMemo(() => factory.listWorkspaceRecords(), [factory]);

  const effectiveCollectionIds = useMemo(
    () =>
      selectedCollectionId === "all"
        ? collectionIds
        : collectionIds.filter((collectionId) => collectionId === selectedCollectionId),
    [collectionIds, selectedCollectionId],
  );

  const searchFields = useMemo(() => {
    if (selectedCollectionId !== "all") {
      return searchFieldsByCollection[selectedCollectionId] ?? [];
    }

    return [...new Set(Object.values(searchFieldsByCollection).flat())];
  }, [searchFieldsByCollection, selectedCollectionId]);

  const fetchRecords = useCallback(async () => {
    if (!currentWorkspace) {
      setRecords([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    if (effectiveCollectionIds.length === 0) {
      setRecords([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await listWorkspaceRecordsUseCase.execute(effectiveCollectionIds, {
      ...pagination,
      searchFields,
    });

    if (result.ok) {
      setRecords(result.value.data);
      setTotal(result.value.total);
    } else {
      setRecords([]);
      setTotal(0);
    }
    setLoading(false);
  }, [
    currentWorkspace,
    effectiveCollectionIds,
    listWorkspaceRecordsUseCase,
    pagination,
    searchFields,
  ]);

  useEffect(() => {
    const init = async () => {
      await fetchRecords();
    };
    void init();
  }, [fetchRecords]);

  const setSearch = useCallback((search: string) => {
    setPagination((prev) => ({ ...prev, search, page: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const updateSelectedCollection = useCallback((nextValue: string) => {
    setSelectedCollectionId(nextValue);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  return {
    records,
    total,
    loading,
    pagination,
    selectedCollectionId,
    setSearch,
    setPage,
    setSelectedCollectionId: updateSelectedCollection,
    refresh: fetchRecords,
  };
}
