import { ColumnFilter } from '../types/pagination.types';

export interface GridFiltersState {
  filters: ColumnFilter[];
  rawValues: Record<string, string>;
  search: string; // Global search term persistence
}

/**
 * Port for persisting Grid preferences (Filters, Page Size, etc.)
 * Strictly following Hexagonal Architecture (Domain Port)
 */
export interface IGridStateRepository {
  saveFilters(collectionId: string, state: GridFiltersState): void;
  getFilters(collectionId: string): GridFiltersState | null;
  clearFilters(collectionId: string): void;
}
