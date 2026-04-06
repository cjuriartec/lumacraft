import { useCallback, useMemo } from "react";

import {
  LoadGridFiltersUseCase,
  PersistGridFiltersUseCase,
} from "../../application/use-cases/persist-grid-filters.use-case";
import { ColumnFilter } from "../../domain/types/pagination.types";
import { LocalStorageGridStateRepository } from "../../infrastructure/repositories/local-storage-grid-state.repository";

/**
 * Senior Presentation Hook for handling Grid filters persistence.
 * Bridge between UI and Domain Use Cases.
 */
export function useGridPersistence(collectionId: string | null) {
  const repository = useMemo(() => new LocalStorageGridStateRepository(), []);
  const persistUseCase = useMemo(() => new PersistGridFiltersUseCase(repository), [repository]);
  const loadUseCase = useMemo(() => new LoadGridFiltersUseCase(repository), [repository]);

  const persistFilters = useCallback(
    async (filters: ColumnFilter[], rawValues: Record<string, string>, search: string) => {
      if (!collectionId) return;
      await persistUseCase.execute(collectionId, { filters, rawValues, search });
    },
    [collectionId, persistUseCase],
  );

  const loadStoredFilters = useCallback(async () => {
    if (!collectionId) return null;
    return await loadUseCase.execute(collectionId);
  }, [collectionId, loadUseCase]);

  const clearStoredFilters = useCallback(() => {
    if (!collectionId) return;
    repository.clearFilters(collectionId);
  }, [collectionId, repository]);

  return {
    persistFilters,
    loadStoredFilters,
    clearStoredFilters,
  };
}
