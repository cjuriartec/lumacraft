'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { WorkspaceMember } from '../../domain/entities/workspace-member.entity'
import { SupabaseWorkspaceMemberRepository } from '../../infrastructure/repositories/supabase-workspace-member.repository'
import { SupabaseWorkspaceRepository } from '../../infrastructure/repositories/supabase-workspace.repository'
import { ManageMembersUseCase, AddMemberRequest, AddMemberByEmailRequest, UpdateMemberRoleRequest } from '../../application/use-cases/manage-members.use-case'

export function useMembers(workspaceId: string | undefined) {
  const { supabase } = useSupabase()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const repository = useMemo(() => new SupabaseWorkspaceMemberRepository(supabase), [supabase])
  const workspaceRepository = useMemo(() => new SupabaseWorkspaceRepository(supabase), [supabase])
  const useCase = useMemo(() => new ManageMembersUseCase(repository, workspaceRepository), [repository, workspaceRepository])

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    const result = await useCase.list(workspaceId)
    if (result.ok) {
      setMembers(result.value)
    } else {
      setError(result.error.message)
    }
    setLoading(false)
  }, [workspaceId, useCase])

  useEffect(() => {
    fetchMembers()

    const handleUpdate = () => fetchMembers()
    if (typeof window !== 'undefined') {
      window.addEventListener('lumacraft:members-updated', handleUpdate)
      return () => window.removeEventListener('lumacraft:members-updated', handleUpdate)
    }
  }, [fetchMembers])

  const addMember = async (request: Omit<AddMemberRequest, 'workspaceId'>) => {
    if (!workspaceId) return
    const result = await useCase.addMember({ ...request, workspaceId })
    if (result.ok) {
       await fetchMembers()
       if (typeof window !== 'undefined') window.dispatchEvent(new Event('lumacraft:members-updated'))
    }
    return result
  }

  const addMemberByEmail = async (request: Omit<AddMemberByEmailRequest, 'workspaceId'>) => {
    if (!workspaceId) return
    const result = await useCase.addMemberByEmail({ ...request, workspaceId })
    if (result.ok) {
      await fetchMembers()
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lumacraft:members-updated'))
    }
    return result
  }

  const updateRole = async (request: UpdateMemberRoleRequest) => {
    const result = await useCase.updateRole(request)
    if (result.ok) {
      setMembers(prev => prev.map(m => m.id === result.value.id ? result.value : m))
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lumacraft:members-updated'))
    }
    return result
  }

  const removeMember = async (memberId: string) => {
    const result = await useCase.removeMember(memberId)
    if (result.ok) {
      setMembers(prev => prev.filter(m => m.id !== memberId))
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('lumacraft:members-updated'))
    }
    return result
  }

  return {
    members,
    loading,
    error,
    addMember,
    addMemberByEmail,
    updateRole,
    removeMember,
    refresh: fetchMembers,
  }
}
