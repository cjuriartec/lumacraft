import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { Field } from '../../domain/entities/field.entity'
import { SupabaseFieldRepository } from '../../infrastructure/repositories/supabase-field.repository'
import { ListFieldsUseCase } from '../../application/use-cases/list-fields.use-case'
import { CreateFieldUseCase, CreateFieldRequest } from '../../application/use-cases/create-field.use-case'
import { UpdateFieldUseCase, UpdateFieldRequest } from '../../application/use-cases/update-field.use-case'
import { DeleteFieldUseCase } from '../../application/use-cases/delete-field.use-case'

export function useFields(collectionId: string) {
  const { supabase } = useSupabase()
  const [fields, setFields] = useState<Field[]>([])
  const [loading, setLoading] = useState(true)

  const repository = useMemo(() => new SupabaseFieldRepository(supabase), [supabase])
  const listUseCase = useMemo(() => new ListFieldsUseCase(repository), [repository])
  const createUseCase = useMemo(() => new CreateFieldUseCase(repository), [repository])
  const updateUseCase = useMemo(() => new UpdateFieldUseCase(repository), [repository])
  const deleteUseCase = useMemo(() => new DeleteFieldUseCase(repository), [repository])

  const fetchFields = useCallback(async () => {
    if (!collectionId) return
    setLoading(true)
    const res = await listUseCase.execute(collectionId)
    if (res.ok) {
      setFields(res.value)
    }
    setLoading(false)
  }, [collectionId, listUseCase])

  useEffect(() => {
    fetchFields()
  }, [fetchFields])

  const createField = async (params: Omit<CreateFieldRequest, 'collectionId'>) => {
    const res = await createUseCase.execute({ ...params, collectionId })
    if (res.ok) {
      await fetchFields()
    }
    return res
  }

  const updateField = async (params: Omit<UpdateFieldRequest, 'collectionId'>) => {
    const res = await updateUseCase.execute({ ...params, collectionId })
    if (res.ok) {
      await fetchFields()
    }
    return res
  }

  const deleteField = async (id: string) => {
    const res = await deleteUseCase.execute(id)
    if (res.ok) {
      await fetchFields()
    }
    return res
  }

  const reorderFields = async (fieldIds: string[]) => {
    const res = await repository.reorder(collectionId, fieldIds)
    if (res.ok) {
      await fetchFields()
    }
    return res
  }

  return {
    fields,
    loading,
    createField,
    updateField,
    deleteField,
    reorderFields,
    refresh: fetchFields,
  }
}
