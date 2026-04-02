import { describe, it, expect } from 'vitest'
import { CollectionPermission } from '@/modules/authorization/domain/entities/permission.entity'
import { PermissionAction } from '@/modules/authorization/domain/value-objects/permission-action.vo'

describe('CollectionPermission Entity', () => {
  const makePermission = (overrides?: Partial<{
    canRead: boolean
    canCreate: boolean
    canUpdate: boolean
    canDelete: boolean
  }>) =>
    new CollectionPermission({
      id: 'perm-1',
      roleId: 'role-1',
      collectionId: 'col-1',
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      ...overrides,
    })

  it('should create a valid permission entity', () => {
    const perm = makePermission({ canRead: true, canCreate: true })
    expect(perm.id).toBe('perm-1')
    expect(perm.roleId).toBe('role-1')
    expect(perm.collectionId).toBe('col-1')
    expect(perm.canRead).toBe(true)
    expect(perm.canCreate).toBe(true)
    expect(perm.canUpdate).toBe(false)
    expect(perm.canDelete).toBe(false)
  })

  it('should check READ permission correctly', () => {
    expect(makePermission({ canRead: true }).hasPermission('READ')).toBe(true)
    expect(makePermission({ canRead: false }).hasPermission('READ')).toBe(false)
  })

  it('should check CREATE permission correctly', () => {
    expect(makePermission({ canCreate: true }).hasPermission('CREATE')).toBe(true)
    expect(makePermission({ canCreate: false }).hasPermission('CREATE')).toBe(false)
  })

  it('should check UPDATE permission correctly', () => {
    expect(makePermission({ canUpdate: true }).hasPermission('UPDATE')).toBe(true)
    expect(makePermission({ canUpdate: false }).hasPermission('UPDATE')).toBe(false)
  })

  it('should check DELETE permission correctly', () => {
    expect(makePermission({ canDelete: true }).hasPermission('DELETE')).toBe(true)
    expect(makePermission({ canDelete: false }).hasPermission('DELETE')).toBe(false)
  })

  it('should check MANAGE only when ALL permissions are granted', () => {
    expect(
      makePermission({
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      }).hasPermission('MANAGE'),
    ).toBe(true)

    expect(
      makePermission({
        canRead: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
      }).hasPermission('MANAGE'),
    ).toBe(false)
  })

  it('should serialize to JSON correctly', () => {
    const perm = makePermission({ canRead: true })
    const json = perm.toJSON()
    expect(json).toEqual({
      id: 'perm-1',
      roleId: 'role-1',
      collectionId: 'col-1',
      canRead: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    })
  })
})

describe('PermissionAction Value Object', () => {
  it('should create valid actions', () => {
    expect(PermissionAction.create('READ').ok).toBe(true)
    expect(PermissionAction.create('CREATE').ok).toBe(true)
    expect(PermissionAction.create('UPDATE').ok).toBe(true)
    expect(PermissionAction.create('DELETE').ok).toBe(true)
    expect(PermissionAction.create('MANAGE').ok).toBe(true)
  })

  it('should accept case-insensitive input', () => {
    const result = PermissionAction.create('read')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.value).toBe('READ')
    }
  })

  it('should fail for invalid actions', () => {
    const result = PermissionAction.create('INVALID')
    expect(result.ok).toBe(false)
  })

  it('MANAGE should imply all other actions', () => {
    const manage = PermissionAction.create('MANAGE')
    if (manage.ok) {
      expect(manage.value.implies('READ')).toBe(true)
      expect(manage.value.implies('CREATE')).toBe(true)
      expect(manage.value.implies('UPDATE')).toBe(true)
      expect(manage.value.implies('DELETE')).toBe(true)
    }
  })

  it('specific actions should only imply themselves', () => {
    const read = PermissionAction.create('READ')
    if (read.ok) {
      expect(read.value.implies('READ')).toBe(true)
      expect(read.value.implies('CREATE')).toBe(false)
      expect(read.value.implies('UPDATE')).toBe(false)
      expect(read.value.implies('DELETE')).toBe(false)
    }
  })
})
