import { describe, expect, it } from 'vitest'

import { makeWorkspace, resetFactories } from '@/__tests__/factories/domain-factories'
import { InMemoryWorkspaceRepository } from '@/__tests__/helpers/fakes'
import { GetWorkspacesByUserUseCase } from '@/modules/workspace/application/use-cases/get-workspaces-by-user.use-case'

describe('GetWorkspacesByUserUseCase', () => {
  it('returns only workspaces for the requested owner', async () => {
    resetFactories()
    const target = makeWorkspace({ ownerId: 'user-1' })
    const ignored = makeWorkspace({ ownerId: 'user-2' })
    const repository = new InMemoryWorkspaceRepository([target, ignored])
    const useCase = new GetWorkspacesByUserUseCase(repository)

    const result = await useCase.execute('user-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toEqual([target])
    }
    expect(repository.findByOwnerId).toHaveBeenCalledWith('user-1')
  })
})

