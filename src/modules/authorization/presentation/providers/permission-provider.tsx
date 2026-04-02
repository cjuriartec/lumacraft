'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { useAuth } from '@/modules/auth/presentation/providers/auth-provider'
import { useWorkspace } from '@/modules/workspace/presentation/providers/workspace-provider'
import { SupabasePermissionRepository } from '../../infrastructure/repositories/supabase-permission.repository'
import { GetUserPermissionsUseCase, CollectionPermissionMap } from '../../application/use-cases/get-user-permissions.use-case'

interface PermissionContextValue {
  /** Check if user can perform an action on a collection */
  can: (collectionId: string, action: 'read' | 'create' | 'update' | 'delete') => boolean
  /** Whether the current user is the workspace owner */
  isOwner: boolean
  /** Whether the current user has a superadmin role */
  isSuperAdmin: boolean
  /** Loading state */
  loading: boolean
  /** Force refresh permissions */
  refresh: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextValue>({
  can: () => true,
  isOwner: false,
  isSuperAdmin: false,
  loading: true,
  refresh: async () => {},
})

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()

  const [isOwner, setIsOwner] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [permissions, setPermissions] = useState<Map<string, CollectionPermissionMap>>(new Map())
  const [loading, setLoading] = useState(true)

  const repository = useMemo(() => new SupabasePermissionRepository(supabase), [supabase])
  const useCase = useMemo(() => new GetUserPermissionsUseCase(repository, supabase), [repository, supabase])

  const fetchPermissions = useCallback(async () => {
    if (!user?.id || !currentWorkspace?.id) {
      setIsOwner(false)
      setIsSuperAdmin(false)
      setPermissions(new Map())
      setLoading(false)
      return
    }

    setLoading(true)
    const result = await useCase.execute(user.id, currentWorkspace.id)

    if (result.ok) {
      setIsOwner(result.value.isOwner)
      setIsSuperAdmin(result.value.isSuperAdmin)
      setPermissions(result.value.permissions)
    }
    setLoading(false)
  }, [user?.id, currentWorkspace?.id, useCase])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const can = useCallback(
    (collectionId: string, action: 'read' | 'create' | 'update' | 'delete'): boolean => {
      // Owner and superadmin bypass all permission checks
      if (isOwner || isSuperAdmin) return true

      const perm = permissions.get(collectionId)
      if (!perm) return false // No explicit permission = no access

      switch (action) {
        case 'read':
          return perm.canRead
        case 'create':
          return perm.canCreate
        case 'update':
          return perm.canUpdate
        case 'delete':
          return perm.canDelete
        default:
          return false
      }
    },
    [isOwner, isSuperAdmin, permissions],
  )

  return (
    <PermissionContext.Provider value={{ can, isOwner, isSuperAdmin, loading, refresh: fetchPermissions }}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  return useContext(PermissionContext)
}
