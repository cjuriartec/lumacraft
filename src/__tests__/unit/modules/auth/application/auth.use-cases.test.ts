import { describe, expect, it } from 'vitest'

import { FakeAuthProvider } from '@/__tests__/helpers/fakes'
import { SignInWithGoogleUseCase } from '@/modules/auth/application/use-cases/sign-in-with-google.use-case'
import { SignOutUseCase } from '@/modules/auth/application/use-cases/sign-out.use-case'
import { DomainError, fail } from '@/shared/domain/result'

describe('auth use cases', () => {
  it('delegates google sign in to the auth provider', async () => {
    const provider = new FakeAuthProvider()
    const useCase = new SignInWithGoogleUseCase(provider)

    const result = await useCase.execute()

    expect(result.ok).toBe(true)
    expect(provider.signInWithGoogle).toHaveBeenCalledOnce()
  })

  it('returns provider sign out failures unchanged', async () => {
    const provider = new FakeAuthProvider()
    provider.signOutResult = fail(new DomainError('Cannot sign out', 'AUTH_ERROR'))
    const useCase = new SignOutUseCase(provider)

    const result = await useCase.execute()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as DomainError).code).toBe('AUTH_ERROR')
    }
    expect(provider.signOut).toHaveBeenCalledOnce()
  })
})
