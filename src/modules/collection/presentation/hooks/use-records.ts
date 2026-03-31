import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { useWorkspace } from '@/modules/workspace/presentation/providers/workspace-provider'
import { useAuth } from '@/modules/auth/presentation/providers/auth-provider'
import { DataRecord } from '../../domain/entities/record.entity'
import { SupabaseRecordRepository } from '../../infrastructure/repositories/supabase-record.repository'
import { SupabaseFieldRepository } from '../../infrastructure/repositories/supabase-field.repository'
import { ListRecordsUseCase } from '../../application/use-cases/list-records.use-case'
import { CreateRecordUseCase } from '../../application/use-cases/create-record.use-case'
import { UpdateRecordUseCase } from '../../application/use-cases/update-record.use-case'
import { DeleteRecordUseCase } from '../../application/use-cases/delete-record.use-case'
import { PaginationOptions, PaginatedResult } from '../../domain/types/pagination.types'

export function useRecords(collectionId: string) {
  const { supabase } = useSupabase()
  const { currentWorkspace } = useWorkspace()
  const { user } = useAuth()
  const [data, setData] = useState<DataRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [pagination, setPagination] = useState<PaginationOptions>({
    page: 1,
    pageSize: 25,
    sortField: 'created_at',
    sortDirection: 'desc'
  })

  const recordRepository = useMemo(() => new SupabaseRecordRepository(supabase), [supabase])
  const fieldRepository = useMemo(() => new SupabaseFieldRepository(supabase), [supabase])
  
  const listUseCase = useMemo(() => new ListRecordsUseCase(recordRepository), [recordRepository])
  const createUseCase = useMemo(() => new CreateRecordUseCase(recordRepository, fieldRepository), [recordRepository, fieldRepository])
  const updateUseCase = useMemo(() => new UpdateRecordUseCase(recordRepository, fieldRepository), [recordRepository, fieldRepository])
  const deleteUseCase = useMemo(() => new DeleteRecordUseCase(recordRepository), [recordRepository])

  const fetchRecords = useCallback(async () => {
    if (!collectionId) {
      setData([])
      setTotal(0)
      setLoading(false)
      return
    }
    setLoading(true)
    const res = await listUseCase.execute(collectionId, pagination)
    if (res.ok) {
      setData(res.value.data)
      setTotal(res.value.total)
    }
    setLoading(false)
  }, [collectionId, listUseCase, pagination])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const createRecord = async (recordData: Record<string, unknown>) => {
    if (!currentWorkspace) return
    const res = await createUseCase.execute({
      collectionId,
      accountId: currentWorkspace.id,
      data: recordData,
      userId: user?.id
    })
    if (res.ok) {
      await fetchRecords()
    }
    return res
  }

  const updateRecord = async (id: string, recordData: Record<string, unknown>) => {
    if (!currentWorkspace) return
    const res = await updateUseCase.execute({
      id,
      collectionId,
      accountId: currentWorkspace.id,
      data: recordData,
      userId: user?.id
    })
    if (res.ok) {
      await fetchRecords()
    }
    return res
  }

  const deleteRecord = async (id: string) => {
    const res = await deleteUseCase.execute(id)
    if (res.ok) {
      await fetchRecords()
    }
    return res
  }

  const setPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  const setSort = (field: string, direction: 'asc' | 'desc') => {
    setPagination(prev => ({ ...prev, sortField: field, sortDirection: direction, page: 1 }))
  }

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
    refresh: fetchRecords,
  }
}
