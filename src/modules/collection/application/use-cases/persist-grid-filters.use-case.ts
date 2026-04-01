import { IGridStateRepository, GridFiltersState } from '../../domain/ports/grid-state-repository.port';

export class PersistGridFiltersUseCase {
  constructor(private readonly repository: IGridStateRepository) {}

  /**
   * Logical orchestration to persist a set of filters for a specific collection.
   */
  async execute(collectionId: string, state: GridFiltersState): Promise<void> {
    if (!collectionId) return;
    this.repository.saveFilters(collectionId, state);
  }
}

export class LoadGridFiltersUseCase {
  constructor(private readonly repository: IGridStateRepository) {}

  /**
   * Retrieval of stored filters to initialize DataGrid filters on mount.
   */
  async execute(collectionId: string): Promise<GridFiltersState | null> {
    if (!collectionId) return null;
    return this.repository.getFilters(collectionId);
  }
}
