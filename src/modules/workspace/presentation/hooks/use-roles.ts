'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { Role } from '../../domain/entities/role.entity'
import { SupabaseRoleRepository } from '../../infrastructure/repositories/supabase-role.repository'
import { ManageRolesUseCase, CreateRoleRequest, UpdateRoleRequest } from '../../application/use-cases/manage-roles.use-case'
import { Result } from '@/shared/domain/result'

export function useRoles(accountId: string | undefined) {
  const { supabase } = useSupabase()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const repository = useMemo(() => new SupabaseRoleRepository(supabase), [supabase])
  const useCase = useMemo(() => new ManageRolesUseCase(repository), [repository])

  const fetchRoles = useCallback(async () => {
    if (!accountId) return
    setLoading(true)
    const result = await useCase.list(accountId)
    if (result.ok) {
      setRoles(result.value)
    } else {
      setError(result.error.message)
    }
    setLoading(false)
  }, [accountId, useCase])

  useEffect(() => {
    fetchRoles()

    const handleUpdate = () => fetchRoles()
    if (typeof window !== 'undefined') {
      window.addEventListener('lumacraft:roles-updated', handleUpdate)
      return () => window.removeEventListener('lumacraft:roles-updated', handleUpdate)
    }
  }, [fetchRoles])

  const createRole = async (request: Omit<CreateRoleRequest, 'accountId'>) => {
    if (!accountId) return
    const result = await useCase.create({ ...request, accountId })
    if (result.ok) {
      setRoles(prev => [...prev, result.value])
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lumacraft:roles-updated'))
    }
    return result
  }

  const updateRole = async (request: UpdateRoleRequest) => {
    const result = await useCase.update(request)
    if (result.ok) {
      setRoles(prev => prev.map(r => r.id === result.value.id ? result.value : r))
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lumacraft:roles-updated'))
    }
    return result
  }

  const deleteRole = async (id: string) => {
    const result = await useCase.delete(id)
    if (result.ok) {
      setRoles(prev => prev.filter(r => r.id !== id))
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lumacraft:roles-updated'))
    }
    return result
  }

  return {
    roles,
    loading,
    error,
    createRole,
    updateRole,
    deleteRole,
    refresh: fetchRoles,
  }
}
