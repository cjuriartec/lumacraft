export type FilterOperator = 'eq' | 'neq' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in'

export interface ColumnFilter {
  field: string
  operator: FilterOperator
  value: unknown
}

export interface PaginationOptions {
  page: number
  pageSize: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  search?: string
  searchFields?: string[]
  filters?: ColumnFilter[]
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
