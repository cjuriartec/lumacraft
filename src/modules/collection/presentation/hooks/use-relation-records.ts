import { useState, useMemo, useCallback } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { useWorkspace } from '@/modules/workspace/presentation/providers/workspace-provider'
import { SupabaseRecordRepository } from '../../infrastructure/repositories/supabase-record.repository'
import { SupabaseCollectionRepository } from '../../infrastructure/repositories/supabase-collection.repository'
import { ListRecordsUseCase } from '../../application/use-cases/list-records.use-case'
import { GetCollectionUseCase } from '../../application/use-cases/get-collection.use-case'
import { Field } from '../../domain/entities/field.entity'
import { DataRecord } from '../../domain/entities/record.entity'

export type RelationOption = {
  id: string
  label: string
}

type RelationFieldConfig = {
  targetCollectionId?: string
  displayField?: string
}

function getRelationFieldConfig(field: Field): RelationFieldConfig {
  return (field.config?.value as RelationFieldConfig | undefined) ?? {}
}

export function useRelationRecords() {
  const { supabase } = useSupabase()
  const { currentWorkspace } = useWorkspace()
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [options, setOptions] = useState<Record<string, RelationOption[]>>({})

  const recordRepository = useMemo(() => new SupabaseRecordRepository(supabase), [supabase])
  const collectionRepository = useMemo(() => new SupabaseCollectionRepository(supabase), [supabase])

  const listUseCase = useMemo(() => new ListRecordsUseCase(recordRepository), [recordRepository])
  const getCollectionUseCase = useMemo(() => new GetCollectionUseCase(collectionRepository), [collectionRepository])

  const resolveLabel = (record: DataRecord, displayField?: string | null): string => {
    // 1. Try specified display field
    if (displayField && displayField !== 'id' && record.data[displayField]) {
      return String(record.data[displayField])
    }

    // 2. Default to ID if no valid primary field is configured
    return record.id
  }

  const searchRelations = useCallback(async (field: Field, query: string) => {
    const config = getRelationFieldConfig(field)
    const targetCollectionId = config?.targetCollectionId

    if (!targetCollectionId || !currentWorkspace) return

    setLoading(prev => ({ ...prev, [field.name]: true }))

    try {
      const collRes = await getCollectionUseCase.execute(targetCollectionId)
      const primaryField = collRes.ok ? collRes.value?.primaryFieldName : null
      const displayFieldToUse = primaryField || config.displayField || 'id'

      const res = await listUseCase.execute(targetCollectionId, {
        page: 1,
        pageSize: 25,
        search: query.trim() || undefined,
        searchFields: displayFieldToUse === 'id' ? [] : [displayFieldToUse],
      })

      if (res.ok) {
        const mapped = res.value.data.map(record => ({
          id: record.id,
          label: resolveLabel(record, displayFieldToUse)
        }))
        setOptions(prev => ({ ...prev, [field.name]: mapped }))
      }
    } finally {
      setLoading(prev => ({ ...prev, [field.name]: false }))
    }
  }, [currentWorkspace, getCollectionUseCase, listUseCase])

  const fetchOptionsByIds = useCallback(async (field: Field, ids: string[]) => {
    if (!ids || ids.length === 0 || !currentWorkspace) return
    const config = getRelationFieldConfig(field)
    const targetCollectionId = config?.targetCollectionId
    if (!targetCollectionId) return

    setLoading(prev => ({ ...prev, [field.name]: true }))

    try {
      const collRes = await getCollectionUseCase.execute(targetCollectionId)
      const primaryField = collRes.ok ? collRes.value?.primaryFieldName : null
      const displayFieldToUse = primaryField || config.displayField || 'id'

      const res = await listUseCase.execute(targetCollectionId, {
        page: 1,
        pageSize: 100,
        filters: [{ field: 'id', operator: 'in', value: ids }]
      })

      if (res.ok) {
        const mapped = res.value.data.map(record => ({
          id: record.id,
          label: resolveLabel(record, displayFieldToUse)
        }))

        setOptions(prev => {
          const current = prev[field.name] || []
          const existingIds = new Set(current.map(o => o.id))
          const newOnes = mapped.filter(o => !existingIds.has(o.id))
          return { ...prev, [field.name]: [...current, ...newOnes] }
        })
      }
    } finally {
      setLoading(prev => ({ ...prev, [field.name]: false }))
    }
  }, [currentWorkspace, getCollectionUseCase, listUseCase])

  const fetchBatchOptionsByIds = useCallback(async (tasks: { field: Field, ids: string[] }[]) => {
    if (tasks.length === 0 || !currentWorkspace) return

    // Set all fields to loading
    setLoading(prev => {
      const next = { ...prev }
      tasks.forEach(({ field }) => {
        next[field.name] = true
      })
      return next
    })

    try {
      await Promise.all(tasks.map(async ({ field, ids }) => {
        const config = getRelationFieldConfig(field)
        const targetCollectionId = config?.targetCollectionId
        if (!targetCollectionId) return

        const collRes = await getCollectionUseCase.execute(targetCollectionId)
        const primaryField = collRes.ok ? collRes.value?.primaryFieldName : null
        const displayFieldToUse = primaryField || config.displayField || 'id'

        const res = await listUseCase.execute(targetCollectionId, {
          page: 1,
          pageSize: 100,
          filters: [{ field: 'id', operator: 'in', value: ids }]
        })

        if (res.ok) {
          const mapped = res.value.data.map(record => ({
            id: record.id,
            label: resolveLabel(record, displayFieldToUse)
          }))

          setOptions(prev => {
            const current = prev[field.name] || []
            const existingIds = new Set(current.map(o => o.id))
            const newOnes = mapped.filter(o => !existingIds.has(o.id))
            return { ...prev, [field.name]: [...current, ...newOnes] }
          })
        }
      }))
    } finally {
      setLoading(prev => {
        const next = { ...prev }
        tasks.forEach(({ field }) => {
          next[field.name] = false
        })
        return next
      })
    }
  }, [currentWorkspace, getCollectionUseCase, listUseCase])

  return useMemo(() => ({
    options,
    loading,
    searchRelations,
    fetchOptionsByIds,
    fetchBatchOptionsByIds
  }), [options, loading, searchRelations, fetchOptionsByIds, fetchBatchOptionsByIds])
}
