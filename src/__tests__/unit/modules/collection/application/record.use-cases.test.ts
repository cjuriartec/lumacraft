import { describe, expect, it, vi } from 'vitest'

import {
  makeField,
  makeRecord,
  resetFactories,
} from '@/__tests__/factories/domain-factories'
import {
  InMemoryFieldRepository,
  InMemoryRecordRepository,
  InMemoryRelationRepository,
} from '@/__tests__/helpers/fakes'
import { CreateRecordUseCase } from '@/modules/collection/application/use-cases/create-record.use-case'
import { DeleteRecordUseCase } from '@/modules/collection/application/use-cases/delete-record.use-case'
import { ListRecordsUseCase } from '@/modules/collection/application/use-cases/list-records.use-case'
import { UpdateRecordUseCase } from '@/modules/collection/application/use-cases/update-record.use-case'

describe('record use cases', () => {
  it('creates valid records after schema validation', async () => {
    resetFactories()
    const fieldRepository = new InMemoryFieldRepository([
      makeField({ collectionId: 'collection-1', name: 'title', isRequired: true }),
    ])
    const recordRepository = new InMemoryRecordRepository()
    const useCase = new CreateRecordUseCase(recordRepository, fieldRepository)
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('record-123')

    const result = await useCase.execute({
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { title: 'Launch' },
      userId: 'user-1',
    })

    expect(result.ok).toBe(true)
    expect(recordRepository.create).toHaveBeenCalledOnce()
    expect(recordRepository.create.mock.calls[0][0].id).toBe('record-123')
    uuidSpy.mockRestore()
  })

  it('rejects duplicate values for unique fields', async () => {
    resetFactories()
    const fieldRepository = new InMemoryFieldRepository([
      makeField({ collectionId: 'collection-1', name: 'slug', isUnique: true }),
    ])
    const recordRepository = new InMemoryRecordRepository([
      makeRecord({ collectionId: 'collection-1', data: { slug: 'launch-plan' } }),
    ])
    const useCase = new CreateRecordUseCase(recordRepository, fieldRepository)

    const result = await useCase.execute({
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { slug: 'launch-plan' },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error)
      expect((result.error as Error & { code?: string }).code).toBe('DUPLICATE_VALUE')
    }
    expect(recordRepository.create).not.toHaveBeenCalled()
  })

  it('allows updating a record when the unique value belongs to itself', async () => {
    resetFactories()
    const fieldRepository = new InMemoryFieldRepository([
      makeField({ collectionId: 'collection-1', name: 'slug', isUnique: true }),
    ])
    const recordRepository = new InMemoryRecordRepository([
      makeRecord({ id: 'record-1', collectionId: 'collection-1', data: { slug: 'launch-plan' } }),
    ])
    const useCase = new UpdateRecordUseCase(recordRepository, fieldRepository)

    const result = await useCase.execute({
      id: 'record-1',
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { slug: 'launch-plan' },
      userId: 'user-1',
    })

    expect(result.ok).toBe(true)
    expect(recordRepository.update).toHaveBeenCalledOnce()
  })

  it('lists paginated records and delegates deletion', async () => {
    resetFactories()
    const record = makeRecord({ collectionId: 'collection-1', data: { title: 'Alpha' } })
    const recordRepository = new InMemoryRecordRepository([record])
    const listUseCase = new ListRecordsUseCase(recordRepository)
    const deleteUseCase = new DeleteRecordUseCase(recordRepository)

    const listed = await listUseCase.execute('collection-1', {
      page: 1,
      pageSize: 25,
      sortField: 'title',
      sortDirection: 'asc',
    })
    const deleted = await deleteUseCase.execute(record.id)

    expect(listed.ok).toBe(true)
    if (listed.ok) {
      expect(listed.value.total).toBe(1)
      expect(listed.value.data).toEqual([record])
    }
    expect(deleted.ok).toBe(true)
    expect(recordRepository.delete).toHaveBeenCalledWith(record.id)
  })

  it('syncs relation links when creating relation fields', async () => {
    resetFactories()
    const relationField = makeField({
      id: 'field-relation-1',
      collectionId: 'collection-1',
      name: 'client',
      fieldType: 'RELATION',
      config: {
        targetCollectionId: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9',
        relationType: 'ONE_TO_ONE',
        displayField: 'name',
      },
    })
    const fieldRepository = new InMemoryFieldRepository([relationField])
    const recordRepository = new InMemoryRecordRepository()
    const relationRepository = new InMemoryRelationRepository()
    const useCase = new CreateRecordUseCase(recordRepository, fieldRepository, relationRepository)
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('record-123')

    const result = await useCase.execute({
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { client: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9' },
    })

    expect(result.ok).toBe(true)
    expect(relationRepository.validateCardinality).toHaveBeenCalledOnce()
    expect(relationRepository.syncFieldRelationsForSource).toHaveBeenCalledOnce()
    uuidSpy.mockRestore()
  })

  it('fails create/update when relation cardinality is violated', async () => {
    resetFactories()
    const relationField = makeField({
      id: 'field-relation-2',
      collectionId: 'collection-1',
      name: 'client',
      fieldType: 'RELATION',
      config: {
        targetCollectionId: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9',
        relationType: 'ONE_TO_ONE',
        displayField: 'name',
      },
    })
    const fieldRepository = new InMemoryFieldRepository([relationField])
    const relationRepository = new InMemoryRelationRepository([
      {
        id: 'rel-1',
        accountId: 'workspace-1',
        fieldId: relationField.id,
        sourceRecordId: 'record-existing',
        targetRecordId: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9',
        createdAt: new Date(),
      },
    ])
    const recordRepository = new InMemoryRecordRepository([
      makeRecord({
        id: 'record-2',
        collectionId: 'collection-1',
        accountId: 'workspace-1',
        data: { client: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9' },
      }),
    ])

    const createUseCase = new CreateRecordUseCase(recordRepository, fieldRepository, relationRepository)
    const updateUseCase = new UpdateRecordUseCase(recordRepository, fieldRepository, relationRepository)

    const createResult = await createUseCase.execute({
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { client: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9' },
    })
    const updateResult = await updateUseCase.execute({
      id: 'record-2',
      collectionId: 'collection-1',
      accountId: 'workspace-1',
      data: { client: '4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9' },
    })

    expect(createResult.ok).toBe(false)
    expect(updateResult.ok).toBe(false)
    expect(recordRepository.create).not.toHaveBeenCalled()
    expect(recordRepository.update).not.toHaveBeenCalled()
  })
})
