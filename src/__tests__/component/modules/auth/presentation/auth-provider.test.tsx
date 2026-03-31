import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { makeUser, resetFactories } from '@/__tests__/factories/domain-factories'
import { FakeAuthProvider, InMemoryWorkspaceRepository } from '@/__tests__/helpers/fakes'
import { renderWithProviders } from '@/__tests__/helpers/render-with-providers'
import { useAuth } from '@/modules/auth/presentation/providers/auth-provider'

function AuthProbe() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  return (
    <div>
      <span>{loading ? 'loading' : user?.email.value ?? 'anonymous'}</span>
      <button type="button" onClick={() => signInWithGoogle()}>
        sign-in
      </button>
      <button type="button" onClick={() => signOut()}>
        sign-out
      </button>
    </div>
  )
}

describe('AuthProvider', () => {
  it('loads the current user and delegates auth actions', async () => {
    resetFactories()
    const user = makeUser({ fullName: 'Ada Lovelace' })
    const authProvider = new FakeAuthProvider()
    authProvider.currentUserResult = { ok: true, value: user }

    renderWithProviders(<AuthProbe />, {
      authService: authProvider,
      workspaceRepository: new InMemoryWorkspaceRepository(),
    })

    await waitFor(() => {
      expect(screen.getByText(user.email.value)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('sign-in'))
    fireEvent.click(screen.getByText('sign-out'))

    expect(authProvider.signInWithGoogle).toHaveBeenCalledOnce()
    expect(authProvider.signOut).toHaveBeenCalledOnce()
  })

  it('reacts to auth state changes after the initial load', async () => {
    resetFactories()
    const nextUser = makeUser({ email: makeUser().email })
    const authProvider = new FakeAuthProvider()

    renderWithProviders(<AuthProbe />, {
      authService: authProvider,
      workspaceRepository: new InMemoryWorkspaceRepository(),
    })

    await waitFor(() => {
      expect(screen.getByText('anonymous')).toBeInTheDocument()
    })

    act(() => {
      authProvider.emitAuthState(nextUser)
    })

    expect(await screen.findByText(nextUser.email.value)).toBeInTheDocument()
  })
})

