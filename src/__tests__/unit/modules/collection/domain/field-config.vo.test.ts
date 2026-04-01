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

  it('accepts text config with multiline flag', () => {
    const result = FieldConfig.create('TEXT', {
      multiline: true,
      maxLength: 2000,
      placeholder: 'Notas…',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.value).toEqual({
        multiline: true,
        maxLength: 2000,
        placeholder: 'Notas…',
      })
    }
  })

  it('accepts relation config for advanced relation fields', () => {
    const result = FieldConfig.create('RELATION', {
      targetCollectionId: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9',
      relationType: 'MANY_TO_MANY',
      displayField: 'title',
    })

    expect(result.ok).toBe(true)
  })

  it('fails relation config when displayField is missing', () => {
    const result = FieldConfig.create('RELATION', {
      targetCollectionId: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9',
      relationType: 'ONE_TO_ONE',
    })

    expect(result.ok).toBe(false)
  })

  it('validates location coordinate bounds', () => {
    const result = FieldConfig.create('LOCATION', {
      minLat: -100,
    })

    expect(result.ok).toBe(false)
  })
})
