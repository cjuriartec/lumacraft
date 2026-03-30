import { describe, it, expect } from 'vitest'
import { Collection } from '@/modules/collection/domain/entities/collection.entity'

describe('Collection Entity', () => {
  it('should create a valid collection', () => {
    const id = crypto.randomUUID()
    const accountId = crypto.randomUUID()
    const collection = new Collection({
      id,
      accountId,
      name: 'test_collection',
      displayName: 'Test Collection',
      description: 'A collection for testing purposes',
      icon: 'database',
    })

    expect(collection.id).toBe(id)
    expect(collection.accountId).toBe(accountId)
    expect(collection.name).toBe('test_collection')
    expect(collection.displayName).toBe('Test Collection')
    expect(collection.description).toBe('A collection for testing purposes')
    expect(collection.icon).toBe('database')
  })

  it('should convert to JSON correctly', () => {
    const props = {
      id: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      name: 'test',
      displayName: 'Test',
      description: 'Desc',
      icon: 'icon',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const collection = new Collection(props)
    const json = collection.toJSON()

    expect(json.id).toBe(props.id)
    expect(json.name).toBe(props.name)
    expect(json.accountId).toBe(props.accountId)
  })
})
