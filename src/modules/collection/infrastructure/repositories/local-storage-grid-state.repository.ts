import { IGridStateRepository, GridFiltersState } from '../../domain/ports/grid-state-repository.port';

const STORAGE_PREFIX = 'lumacraft_grid_filters_';

/**
 * Adapter for LocalStorage persistence. 
 * Strictly decoupled from React but following Hexagonal rules.
 */
export class LocalStorageGridStateRepository implements IGridStateRepository {
  private makeKey(collectionId: string): string {
    return `${STORAGE_PREFIX}${collectionId}`;
  }

  public saveFilters(collectionId: string, state: GridFiltersState): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.makeKey(collectionId), JSON.stringify(state));
    } catch (e) {
      console.warn('Grid Filters Persistence Error (Write):', e);
    }
  }

  public getFilters(collectionId: string): GridFiltersState | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(this.makeKey(collectionId));
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.warn('Grid Filters Persistence Error (Read):', e);
      return null;
    }
  }

  public clearFilters(collectionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.makeKey(collectionId));
  }
}
