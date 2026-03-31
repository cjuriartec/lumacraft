import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { makeUser, makeWorkspace, resetFactories } from '@/__tests__/factories/domain-factories'
import { FakeAuthProvider, InMemoryWorkspaceRepository } from '@/__tests__/helpers/fakes'
import { renderWithProviders } from '@/__tests__/helpers/render-with-providers'
import { useWorkspace } from '@/modules/workspace/presentation/providers/workspace-provider'

function WorkspaceProbe() {
  const { workspaces, currentWorkspace, loading, setCurrentWorkspace } = useWorkspace()

  return (
    <div>
      <span>{loading ? 'loading' : currentWorkspace?.name ?? 'no-workspace'}</span>
      <span>{workspaces.length}</span>
      {workspaces[1] ? (
        <button type="button" onClick={() => setCurrentWorkspace(workspaces[1])}>
          switch
        </button>
      ) : null}
    </div>
  )
}

describe('WorkspaceProvider', () => {
  beforeEach(() => {
    const storage = window.localStorage as Storage | undefined
    if (typeof storage?.clear === 'function') {
      storage.clear()
    } else if (typeof storage?.removeItem === 'function') {
      storage.removeItem('lumacraft.currentWorkspaceId')
    }
  })

  it('selects the first workspace for the authenticated user', async () => {
    resetFactories()
    const user = makeUser({ id: 'user-1' })
    const authProvider = new FakeAuthProvider()
    authProvider.currentUserResult = { ok: true, value: user }

    const first = makeWorkspace({ id: 'workspace-1', ownerId: 'user-1', name: 'Personal' })
    const second = makeWorkspace({ id: 'workspace-2', ownerId: 'user-1', name: 'Team' })
    const workspaceRepository = new InMemoryWorkspaceRepository([first, second])

    renderWithProviders(<WorkspaceProbe />, {
      authService: authProvider,
      workspaceRepository,
    })

    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument()
    })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('allows switching the current workspace without re-fetch loops', async () => {
    resetFactories()
    const user = makeUser({ id: 'user-1' })
    const authProvider = new FakeAuthProvider()
    authProvider.currentUserResult = { ok: true, value: user }

    const first = makeWorkspace({ id: 'workspace-1', ownerId: 'user-1', name: 'Personal' })
    const second = makeWorkspace({ id: 'workspace-2', ownerId: 'user-1', name: 'Team' })
    const workspaceRepository = new InMemoryWorkspaceRepository([first, second])

    renderWithProviders(<WorkspaceProbe />, {
      authService: authProvider,
      workspaceRepository,
    })

    await screen.findByText('Personal')
    fireEvent.click(screen.getByText('switch'))

    await waitFor(() => {
      expect(screen.getByText('Team')).toBeInTheDocument()
    })
    expect(workspaceRepository.findByUserId).toHaveBeenCalledTimes(1)
    const storage = window.localStorage as Storage | undefined
    if (typeof storage?.getItem === 'function') {
      expect(storage.getItem('lumacraft.currentWorkspaceId')).toBe('workspace-2')
    }
  })
})
