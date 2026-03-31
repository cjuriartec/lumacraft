export interface PaginationOptions {
  page: number
  pageSize: number
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
