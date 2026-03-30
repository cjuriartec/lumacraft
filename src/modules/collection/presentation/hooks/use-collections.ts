'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWorkspace } from '@/modules/workspace/presentation/providers/workspace-provider'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { Collection } from '../../domain/entities/collection.entity'
import { SupabaseCollectionRepository } from '../../infrastructure/repositories/supabase-collection.repository'
import { ListCollectionsUseCase } from '../../application/use-cases/list-collections.use-case'
import { CreateCollectionUseCase } from '../../application/use-cases/create-collection.use-case'
import { DeleteCollectionUseCase } from '../../application/use-cases/delete-collection.use-case'

export function useCollections() {
  const { currentWorkspace } = useWorkspace()
  const { supabase } = useSupabase()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  const repository = useMemo(() => new SupabaseCollectionRepository(supabase), [supabase])
  const listUseCase = useMemo(() => new ListCollectionsUseCase(repository), [repository])
  const createUseCase = useMemo(() => new CreateCollectionUseCase(repository), [repository])
  const deleteUseCase = useMemo(() => new DeleteCollectionUseCase(repository), [repository])

  const fetchCollections = useCallback(async () => {
    if (!currentWorkspace) return
    setLoading(true)
    const res = await listUseCase.execute(currentWorkspace.id)
    if (res.ok) {
      setCollections(res.value)
    }
    setLoading(false)
  }, [currentWorkspace, listUseCase])

  useEffect(() => {
    const ignore = false
    const load = async () => {
      setLoading(true)
      const res = await listUseCase.execute(currentWorkspace!.id)
      if (!ignore) {
        if (res.ok) setCollections(res.value)
        setLoading(false)
      }
    }
    if (currentWorkspace) {
      load()
    }
  }, [currentWorkspace, listUseCase])

  const createCollection = async (params: {
    name: string
    displayName?: string
    description?: string
    icon?: string
  }) => {
    if (!currentWorkspace) return
    const res = await createUseCase.execute({
      accountId: currentWorkspace.id,
      ...params,
    })
    if (res.ok) {
      await fetchCollections()
    }
    return res
  }

  const deleteCollection = async (id: string) => {
    const res = await deleteUseCase.execute(id)
    if (res.ok) {
      await fetchCollections()
    }
    return res
  }

  return {
    collections,
    loading,
    createCollection,
    deleteCollection,
    refresh: fetchCollections,
  }
}
