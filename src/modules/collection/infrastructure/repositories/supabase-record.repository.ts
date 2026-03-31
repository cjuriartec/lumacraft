import { BaseRepository } from '@/shared/infrastructure/base-repository'
import { IRecordRepository } from '../../domain/ports/record-repository.port'
import { DataRecord } from '../../domain/entities/record.entity'
import { Result, ok, fail, DomainError } from '@/shared/domain/result'
import { ColumnFilter, PaginationOptions, PaginatedResult } from '../../domain/types/pagination.types'
import { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseRecordRepository extends BaseRepository implements IRecordRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'records')
  }

  public async findByCollectionId(collectionId: string, options: PaginationOptions): Promise<Result<PaginatedResult<DataRecord>>> {
    const { page, pageSize, sortField, sortDirection, search, searchFields, filters } = options
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = this.table
      .select('*', { count: 'exact' })
      .eq('collection_id', collectionId)

    if (search && search.trim().length > 0 && searchFields && searchFields.length > 0) {
      const term = `%${search.trim().replaceAll(',', '')}%`
      const orExpression = searchFields
        .map((field) => `data->>${field}.ilike.${term}`)
        .join(',')
      query = query.or(orExpression)
    }

    if (filters && filters.length > 0) {
      query = this.applyFilters(query, filters)
    }

    if (sortField) {
      const isAsc = sortDirection === 'asc'
      const nativeColumns = ['id', 'created_at', 'updated_at', 'collection_id', 'account_id', 'created_by', 'updated_by']

      if (nativeColumns.includes(sortField)) {
        query = query.order(sortField, { ascending: isAsc })
      } else {
        query = query.order(`data->>${sortField}`, { ascending: isAsc })
      }
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error, count } = await query.range(from, to)

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))

    const total = count || 0
    const totalPages = Math.ceil(total / pageSize)

    return ok({
      data: data.map((item: Record<string, unknown>) => this.toEntity(item)),
      total,
      page,
      pageSize,
      totalPages,
    })
  }

  public async findById(id: string): Promise<Result<DataRecord | null>> {
    const { data, error } = await this.table.select('*').eq('id', id).single()

    if (error) {
      if (error.code === 'PGRST116') return ok(null)
      return fail(new DomainError(error.message, 'DB_ERROR'))
    }

    return ok(this.toEntity(data))
  }

  public async create(record: DataRecord): Promise<Result<DataRecord>> {
    const persistence = this.toPersistence(record)
    const { data, error } = await this.table.insert(persistence).select().single()

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))

    return ok(this.toEntity(data))
  }

  public async update(record: DataRecord): Promise<Result<DataRecord>> {
    const persistence = this.toPersistence(record)
    const { data, error } = await this.table
      .update(persistence)
      .eq('id', record.id)
      .select()
      .single()

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))

    return ok(this.toEntity(data))
  }

  public async delete(id: string): Promise<Result<void>> {
    const { error } = await this.table.delete().eq('id', id)
    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(undefined)
  }

  public async count(collectionId: string): Promise<Result<number>> {
    const { count, error } = await this.table
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', collectionId)

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok(count || 0)
  }

  public async findByFieldValue(collectionId: string, fieldName: string, value: any): Promise<Result<DataRecord[]>> {
    const { data, error } = await this.table
      .select('*')
      .eq('collection_id', collectionId)
      .filter(`data->>${fieldName}`, 'eq', String(value))

    if (error) return fail(new DomainError(error.message, 'DB_ERROR'))
    return ok((data as any[]).map(item => this.toEntity(item)))
  }

  private applyFilters(query: any, filters: ColumnFilter[]) {
    let nextQuery = query
    const nativeColumns = ['id', 'created_at', 'updated_at', 'collection_id', 'account_id', 'created_by', 'updated_by']

    for (const filter of filters) {
      const isNative = nativeColumns.includes(filter.field)
      const column = isNative ? filter.field : `data->>${filter.field}`

      switch (filter.operator) {
        case 'eq':
          nextQuery = nextQuery.eq(column, filter.value)
          break
        case 'neq':
          nextQuery = nextQuery.neq(column, filter.value)
          break
        case 'contains':
          nextQuery = nextQuery.ilike(column, `%${String(filter.value)}%`)
          break
        case 'gt':
          nextQuery = nextQuery.gt(column, filter.value)
          break
        case 'gte':
          nextQuery = nextQuery.gte(column, filter.value)
          break
        case 'lt':
          nextQuery = nextQuery.lt(column, filter.value)
          break
        case 'lte':
          nextQuery = nextQuery.lte(column, filter.value)
          break
        case 'in':
          if (Array.isArray(filter.value)) {
            nextQuery = nextQuery.in(column, filter.value)
          }
          break
      }
    }

    return nextQuery
  }

  private toEntity(data: Record<string, unknown>): DataRecord {
    return new DataRecord({
      id: data.id as string,
      collectionId: data.collection_id as string,
      accountId: data.account_id as string,
      data: (data.data as Record<string, unknown>) || {},
      createdBy: data.created_by as string,
      updatedBy: data.updated_by as string,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    })
  }

  private toPersistence(record: DataRecord) {
    const json = record.toJSON()
    return {
      id: json.id,
      collection_id: json.collectionId,
      account_id: json.accountId,
      data: json.data,
      created_by: json.createdBy,
      updated_by: json.updatedBy,
      updated_at: new Date().toISOString(),
    }
  }
}
