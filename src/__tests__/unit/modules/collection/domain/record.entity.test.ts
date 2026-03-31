import { describe, expect, it } from 'vitest'

import {
  makeField,
  makeRecord,
  resetFactories,
} from '@/__tests__/factories/domain-factories'

describe('DataRecord entity', () => {
  it('validates required fields', () => {
    resetFactories()
    const field = makeField({
      name: 'title',
      displayName: 'Title',
      isRequired: true,
    })
    const record = makeRecord({ data: {} })

    const result = record.validateAgainstSchema([field])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe('REQUIRED_FIELD_MISSING')
    }
  })

  it('rejects invalid numbers', () => {
    resetFactories()
    const field = makeField({
      name: 'budget',
      fieldType: 'NUMBER',
    })
    const record = makeRecord({ data: { budget: 'not-a-number' } })

    const result = record.validateAgainstSchema([field])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe('INVALID_TYPE')
    }
  })

  it('rejects invalid booleans', () => {
    resetFactories()
    const field = makeField({
      name: 'active',
      fieldType: 'BOOLEAN',
    })
    const record = makeRecord({ data: { active: 'yes' } })

    const result = record.validateAgainstSchema([field])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe('INVALID_TYPE')
    }
  })

  it('rejects enum values outside the allowed list', () => {
    resetFactories()
    const field = makeField({
      name: 'status',
      fieldType: 'ENUM',
      config: { options: ['draft', 'published'] },
    })
    const record = makeRecord({ data: { status: 'archived' } })

    const result = record.validateAgainstSchema([field])

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe('INVALID_ENUM_VALUE')
    }
  })

  it('serializes validated data records', () => {
    resetFactories()
    const record = makeRecord({
      id: 'record-1',
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { title: 'Launch Plan' },
    })

    expect(record.toJSON()).toEqual({
      id: 'record-1',
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { title: 'Launch Plan' },
      createdBy: record.createdBy,
      updatedBy: record.updatedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    })
  })
})
