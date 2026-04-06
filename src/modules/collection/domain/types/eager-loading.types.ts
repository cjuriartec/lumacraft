export interface EagerLoadRequest {
  recordId: string;
  collectionId: string;
  /** Max depth to resolve relations (default: 2, max: 5) */
  depth?: number;
  /** Optional: only resolve these field names */
  includeFields?: string[];
}

export interface EagerLoadedRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  data: Record<string, unknown>;
  relations: Record<string, EagerLoadedRecord | EagerLoadedRecord[]>;
}
