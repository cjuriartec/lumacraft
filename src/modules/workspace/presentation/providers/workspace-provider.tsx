'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { Workspace } from '../../domain/entities/workspace.entity'
import { GetWorkspacesByUserUseCase } from '../../application/use-cases/get-workspaces-by-user.use-case'
import { SupabaseWorkspaceRepository } from '../../infrastructure/repositories/supabase-workspace.repository'
import { useAuth } from '@/modules/auth/presentation/providers/auth-provider'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'

type WorkspaceContext = {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  setCurrentWorkspace: (workspace: Workspace) => void
  loading: boolean
}

const Context = createContext<WorkspaceContext | undefined>(undefined)

export default function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const repository = useMemo(() => new SupabaseWorkspaceRepository(supabase), [supabase])
  const getWorkspacesUseCase = useMemo(() => new GetWorkspacesByUserUseCase(repository), [repository])

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user) return

      const res = await getWorkspacesUseCase.execute(user.id)
      if (res.ok) {
        setWorkspaces(res.value)
        if (res.value.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(res.value[0])
        }
      }
      setLoading(false)
    }

    fetchWorkspaces()
  }, [user, currentWorkspace, getWorkspacesUseCase])

  return (
    <Context.Provider value={{ workspaces, currentWorkspace, setCurrentWorkspace, loading }}>
      {children}
    </Context.Provider>
  )
}

export const useWorkspace = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider')
  }
  return context
}
