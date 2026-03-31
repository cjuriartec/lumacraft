import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  makeCollection,
  makeField,
  makeRecord,
} from '@/__tests__/factories/domain-factories'
import {
  addMemberToAccount,
  canRunLocalSupabaseTests,
  cleanupTestUser,
  createTestUser,
  getPersonalAccountId,
  TestUserSession,
} from '@/__tests__/helpers/supabase-harness'
import { SupabaseCollectionRepository } from '@/modules/collection/infrastructure/repositories/supabase-collection.repository'
import { SupabaseFieldRepository } from '@/modules/collection/infrastructure/repositories/supabase-field.repository'
import { SupabaseRecordRepository } from '@/modules/collection/infrastructure/repositories/supabase-record.repository'

const describeIfLocalSupabase = canRunLocalSupabaseTests ? describe : describe.skip

describeIfLocalSupabase('Supabase repositories integration', () => {
  let owner: TestUserSession
  let member: TestUserSession
  let outsider: TestUserSession
  let accountId: string

  beforeAll(async () => {
    owner = await createTestUser('repo-owner')
    member = await createTestUser('repo-member')
    outsider = await createTestUser('repo-outsider')
    accountId = await getPersonalAccountId(owner.id)
    await addMemberToAccount(accountId, member.id)
  })

  afterAll(async () => {
    if (member) {
      await cleanupTestUser(member.id)
    }
    if (outsider) {
      await cleanupTestUser(outsider.id)
    }
    if (owner) {
      await cleanupTestUser(owner.id)
    }
  })

  it('enforces collection RLS while allowing owner and members to read shared data', async () => {
    const ownerCollections = new SupabaseCollectionRepository(owner.client)
    const memberCollections = new SupabaseCollectionRepository(member.client)
    const outsiderCollections = new SupabaseCollectionRepository(outsider.client)

    const created = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `projects_${crypto.randomUUID().slice(0, 6)}`,
        displayName: 'Projects',
      })
    )

    expect(created.ok).toBe(true)

    const memberVisible = await memberCollections.findByAccountId(accountId)
    const outsiderVisible = await outsiderCollections.findByAccountId(accountId)
    const outsiderCreate = await outsiderCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `forbidden_${crypto.randomUUID().slice(0, 6)}`,
        displayName: 'Forbidden',
      })
    )

    expect(memberVisible.ok).toBe(true)
    if (memberVisible.ok && created.ok) {
      expect(memberVisible.value.some((collection) => collection.id === created.value.id)).toBe(true)
    }
    expect(outsiderVisible.ok).toBe(true)
    if (outsiderVisible.ok) {
      expect(outsiderVisible.value).toEqual([])
    }
    expect(outsiderCreate.ok).toBe(false)
  })

  it('supports fields CRUD and ordering while keeping outsiders out', async () => {
    const ownerCollections = new SupabaseCollectionRepository(owner.client)
    const ownerFields = new SupabaseFieldRepository(owner.client)
    const outsiderFields = new SupabaseFieldRepository(outsider.client)

    const collection = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `fields_${crypto.randomUUID().slice(0, 6)}`,
        displayName: 'Field playground',
      })
    )

    if (!collection.ok) {
      throw collection.error
    }

    const titleField = await ownerFields.create(
      makeField({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        name: 'title',
        displayName: 'Title',
        sortOrder: 0,
      })
    )
    const statusField = await ownerFields.create(
      makeField({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        name: 'status',
        fieldType: 'ENUM',
        config: { options: ['draft', 'published'] },
        sortOrder: 1,
      })
    )

    expect(titleField.ok).toBe(true)
    expect(statusField.ok).toBe(true)

    await ownerFields.reorder(collection.value.id, [statusField.ok ? statusField.value.id : '', titleField.ok ? titleField.value.id : ''])

    const ordered = await ownerFields.findByCollectionId(collection.value.id)
    const outsiderVisible = await outsiderFields.findByCollectionId(collection.value.id)

    expect(ordered.ok).toBe(true)
    if (ordered.ok) {
      expect(ordered.value.map((field) => field.name)).toEqual(['status', 'title'])
    }
    expect(outsiderVisible.ok).toBe(true)
    if (outsiderVisible.ok) {
      expect(outsiderVisible.value).toEqual([])
    }
  })

  it('supports record pagination, lookup and RLS by account', async () => {
    const ownerCollections = new SupabaseCollectionRepository(owner.client)
    const ownerRecords = new SupabaseRecordRepository(owner.client)
    const memberRecords = new SupabaseRecordRepository(member.client)
    const outsiderRecords = new SupabaseRecordRepository(outsider.client)

    const collection = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `records_${crypto.randomUUID().slice(0, 6)}`,
        displayName: 'Record playground',
      })
    )

    if (!collection.ok) {
      throw collection.error
    }

    const created = await ownerRecords.create(
      makeRecord({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        accountId,
        createdBy: owner.id,
        data: {
          title: 'Launch plan',
          status: 'draft',
        },
      })
    )

    expect(created.ok).toBe(true)

    const listedByMember = await memberRecords.findByCollectionId(collection.value.id, {
      page: 1,
      pageSize: 10,
      sortField: 'title',
      sortDirection: 'asc',
    })
    const foundByStatus = await memberRecords.findByFieldValue(collection.value.id, 'status', 'draft')
    const count = await memberRecords.count(collection.value.id)
    const outsiderCreate = await outsiderRecords.create(
      makeRecord({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        accountId,
        createdBy: outsider.id,
        data: {
          title: 'Intrusion',
        },
      })
    )

    expect(listedByMember.ok).toBe(true)
    if (listedByMember.ok) {
      expect(listedByMember.value.total).toBe(1)
      expect(listedByMember.value.data[0]?.data.title).toBe('Launch plan')
    }
    expect(foundByStatus.ok).toBe(true)
    if (foundByStatus.ok) {
      expect(foundByStatus.value).toHaveLength(1)
    }
    expect(count.ok).toBe(true)
    if (count.ok) {
      expect(count.value).toBe(1)
    }
    expect(outsiderCreate.ok).toBe(false)
  })
})
