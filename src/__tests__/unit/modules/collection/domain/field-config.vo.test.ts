import { describe, expect, it } from 'vitest'

import { FieldConfig } from '@/modules/collection/domain/value-objects/field-config.vo'

describe('FieldConfig value object', () => {
  it('accepts valid enum configuration', () => {
    const result = FieldConfig.create('ENUM', { options: ['draft', 'published'] })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.value).toEqual({ options: ['draft', 'published'] })
      expect(result.value.fieldType).toBe('ENUM')
    }
  })

  it('fails when enum options are empty', () => {
    const result = FieldConfig.create('ENUM', { options: [] })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.message).toContain('At least one option is required')
    }
  })

  it('provides an empty config helper', () => {
    const config = FieldConfig.empty('TEXT')

    expect(config.value).toEqual({})
    expect(config.fieldType).toBe('TEXT')
  })
})

