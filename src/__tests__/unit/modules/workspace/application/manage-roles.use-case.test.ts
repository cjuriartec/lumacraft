import { describe, it, expect, vi } from 'vitest'
import { ManageRolesUseCase } from '@/modules/workspace/application/use-cases/manage-roles.use-case'
import { IRoleRepository } from '@/modules/workspace/domain/ports/role-repository.port'
import { Role } from '@/modules/workspace/domain/entities/role.entity'
import { ok, fail, DomainError } from '@/shared/domain/result'

function createMockRepository(): IRoleRepository {
  return {
    findAllByAccount: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}

describe('ManageRolesUseCase', () => {
  it('should list roles for an account', async () => {
    const repo = createMockRepository()
    const roles = [
      new Role({ id: '1', accountId: 'acc-1', name: 'Admin', description: 'Admin role', isSuperadmin: true }),
    ]
    repo.findAllByAccount = vi.fn().mockResolvedValue(ok(roles))
    const useCase = new ManageRolesUseCase(repo)

    const result = await useCase.list('acc-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0].name).toBe('Admin')
    }
  })

  it('should create a new role', async () => {
    const repo = createMockRepository()
    repo.create = vi.fn().mockImplementation((role) => Promise.resolve(ok(role)))
    const useCase = new ManageRolesUseCase(repo)

    const result = await useCase.create({
      accountId: 'acc-1',
      name: 'Editor',
      description: 'Editor role',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('Editor')
      expect(result.value.accountId).toBe('acc-1')
      expect(result.value.isSuperadmin).toBe(false)
    }
  })

  it('should update an existing role', async () => {
    const repo = createMockRepository()
    const existingRole = new Role({ id: '1', accountId: 'acc-1', name: 'Old Name', description: 'Old Desc', isSuperadmin: false })
    repo.findById = vi.fn().mockResolvedValue(ok(existingRole))
    repo.update = vi.fn().mockImplementation((role) => Promise.resolve(ok(role)))
    const useCase = new ManageRolesUseCase(repo)

    const result = await useCase.update({
      id: '1',
      name: 'New Name',
      description: 'New Desc',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.name).toBe('New Name')
      expect(result.value.description).toBe('New Desc')
    }
  })

  it('should not delete a superadmin role', async () => {
    const repo = createMockRepository()
    const superadminRole = new Role({ id: '1', accountId: 'acc-1', name: 'Superadmin', description: 'Superadmin role', isSuperadmin: true })
    repo.findById = vi.fn().mockResolvedValue(ok(superadminRole))
    const useCase = new ManageRolesUseCase(repo)

    const result = await useCase.delete('1')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toBe('Cannot delete superadmin role')
    }
  })

  it('should delete a non-superadmin role', async () => {
    const repo = createMockRepository()
    const regularRole = new Role({ id: '1', accountId: 'acc-1', name: 'Editor', description: 'Editor role', isSuperadmin: false })
    repo.findById = vi.fn().mockResolvedValue(ok(regularRole))
    repo.delete = vi.fn().mockResolvedValue(ok(undefined))
    const useCase = new ManageRolesUseCase(repo)

    const result = await useCase.delete('1')

    expect(result.ok).toBe(true)
    expect(repo.delete).toHaveBeenCalledWith('1')
  })
})
