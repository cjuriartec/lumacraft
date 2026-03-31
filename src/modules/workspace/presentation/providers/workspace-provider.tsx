'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { Workspace } from '../../domain/entities/workspace.entity'
import { GetWorkspacesByUserUseCase } from '../../application/use-cases/get-workspaces-by-user.use-case'
import { SupabaseWorkspaceRepository } from '../../infrastructure/repositories/supabase-workspace.repository'
import { useAuth } from '@/modules/auth/presentation/providers/auth-provider'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { IWorkspaceRepository } from '../../domain/ports/workspace-repository.port'

type WorkspaceContext = {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  setCurrentWorkspace: (workspace: Workspace) => void
  loading: boolean
}

const Context = createContext<WorkspaceContext | undefined>(undefined)

export default function WorkspaceProvider({
  children,
  workspaceRepository,
}: {
  children: React.ReactNode
  workspaceRepository?: IWorkspaceRepository
}) {
  const { user } = useAuth()
  const { supabase } = useSupabase()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)

  const repository = useMemo(
    () => workspaceRepository ?? new SupabaseWorkspaceRepository(supabase),
    [workspaceRepository, supabase]
  )
  const getWorkspacesUseCase = useMemo(() => new GetWorkspacesByUserUseCase(repository), [repository])

  useEffect(() => {
    let active = true

    const fetchWorkspaces = async () => {
      if (!user) {
        if (active) {
          setWorkspaces([])
          setCurrentWorkspace(null)
          setLoading(false)
        }
        return
      }

      if (active) {
        setLoading(true)
      }

      const res = await getWorkspacesUseCase.execute(user.id)
      if (!active) return

      if (res.ok) {
        setWorkspaces(res.value)
        setCurrentWorkspace((current) =>
          current && res.value.some((workspace) => workspace.id === current.id)
            ? current
            : (res.value[0] ?? null)
        )
      }
      setLoading(false)
    }

    fetchWorkspaces()
    return () => {
      active = false
    }
  }, [user, getWorkspacesUseCase])

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
