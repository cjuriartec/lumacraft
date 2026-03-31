import { describe, expect, it } from 'vitest'

import { DomainError, fail, ok } from '@/shared/domain/result'

describe('shared/domain/result', () => {
  it('creates successful results with ok()', () => {
    const result = ok({ id: 'abc' })

    expect(result).toEqual({
      ok: true,
      value: { id: 'abc' },
    })
  })

  it('creates failing results with fail()', () => {
    const error = new DomainError('Boom', 'EXPLODED')
    const result = fail(error)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe(error)
      expect(result.error.code).toBe('EXPLODED')
    }
  })

  it('preserves the domain error name', () => {
    const error = new DomainError('Invalid state')

    expect(error.name).toBe('DomainError')
  })
})

