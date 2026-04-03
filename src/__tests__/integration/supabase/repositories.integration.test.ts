import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  makeCollection,
  makeField,
  makeRecord,
  makeTemplate,
} from "@/__tests__/factories/domain-factories";
import {
  addMemberToAccount,
  canRunLocalSupabaseTests,
  cleanupTestUser,
  createTestUser,
  getPersonalAccountId,
  TestUserSession,
} from "@/__tests__/helpers/supabase-harness";
import { SupabaseCollectionRepository } from "@/modules/collection/infrastructure/repositories/supabase-collection.repository";
import { SupabaseFieldRepository } from "@/modules/collection/infrastructure/repositories/supabase-field.repository";
import { SupabaseRecordRepository } from "@/modules/collection/infrastructure/repositories/supabase-record.repository";
import { SupabaseRelationRepository } from "@/modules/collection/infrastructure/repositories/supabase-relation.repository";
import { Template } from "@/modules/template/domain/entities/template.entity";
import { SupabaseTemplateRepository } from "@/modules/template/infrastructure/repositories/supabase-template.repository";

const describeIfLocalSupabase = canRunLocalSupabaseTests ? describe : describe.skip;

describeIfLocalSupabase("Supabase repositories integration", () => {
  let owner: TestUserSession;
  let member: TestUserSession;
  let outsider: TestUserSession;
  let accountId: string;

  beforeAll(async () => {
    owner = await createTestUser("repo-owner");
    member = await createTestUser("repo-member");
    outsider = await createTestUser("repo-outsider");
    accountId = await getPersonalAccountId(owner.id);
    await addMemberToAccount(accountId, member.id);
  });

  afterAll(async () => {
    if (member) {
      await cleanupTestUser(member.id);
    }
    if (outsider) {
      await cleanupTestUser(outsider.id);
    }
    if (owner) {
      await cleanupTestUser(owner.id);
    }
  });

  it("enforces collection RLS while allowing owner and members to read shared data", async () => {
    const ownerCollections = new SupabaseCollectionRepository(owner.client);
    const memberCollections = new SupabaseCollectionRepository(member.client);
    const outsiderCollections = new SupabaseCollectionRepository(outsider.client);

    const created = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `projects_${crypto.randomUUID().slice(0, 6)}`,
        displayName: "Projects",
      }),
    );

    expect(created.ok).toBe(true);

    const memberVisible = await memberCollections.findByAccountId(accountId);
    const outsiderVisible = await outsiderCollections.findByAccountId(accountId);
    const outsiderCreate = await outsiderCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `forbidden_${crypto.randomUUID().slice(0, 6)}`,
        displayName: "Forbidden",
      }),
    );

    expect(memberVisible.ok).toBe(true);
    if (memberVisible.ok && created.ok) {
      expect(memberVisible.value.some((collection) => collection.id === created.value.id)).toBe(
        true,
      );
    }
    expect(outsiderVisible.ok).toBe(true);
    if (outsiderVisible.ok) {
      expect(outsiderVisible.value).toEqual([]);
    }
    expect(outsiderCreate.ok).toBe(false);
  });

  it("enforces template RLS and optimistic version conflicts", async () => {
    const ownerTemplates = new SupabaseTemplateRepository(owner.client);
    const memberTemplates = new SupabaseTemplateRepository(member.client);
    const outsiderTemplates = new SupabaseTemplateRepository(outsider.client);

    const created = await ownerTemplates.create(
      makeTemplate({
        id: crypto.randomUUID(),
        accountId,
        name: `template_${crypto.randomUUID().slice(0, 6)}`,
        collectionId: null,
        blocks: [{ type: "p", children: [{ text: "Documento base" }] }],
      }),
    );

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw created.error;
    }

    const listedByMember = await memberTemplates.findByAccountId(accountId);
    const listedByOutsider = await outsiderTemplates.findByAccountId(accountId);
    const outsiderCreate = await outsiderTemplates.create(
      makeTemplate({
        id: crypto.randomUUID(),
        accountId,
        name: `forbidden_template_${crypto.randomUUID().slice(0, 6)}`,
        collectionId: null,
      }),
    );

    expect(listedByMember.ok).toBe(true);
    if (listedByMember.ok) {
      expect(listedByMember.value.some((template) => template.id === created.value.id)).toBe(true);
    }
    expect(listedByOutsider.ok).toBe(true);
    if (listedByOutsider.ok) {
      expect(listedByOutsider.value).toEqual([]);
    }
    expect(outsiderCreate.ok).toBe(false);

    const nextTemplateResult = Template.create({
      id: created.value.id,
      accountId,
      name: `${created.value.name} v2`,
      description: created.value.description,
      collectionId: created.value.collectionId,
      blocks: created.value.blocks,
      version: created.value.version + 1,
      createdBy: created.value.createdBy,
      createdAt: created.value.createdAt,
      updatedAt: created.value.updatedAt,
    });

    if (!nextTemplateResult.ok) {
      throw nextTemplateResult.error;
    }

    const firstUpdate = await ownerTemplates.update(
      nextTemplateResult.value,
      created.value.version,
    );
    const staleUpdate = await ownerTemplates.update(
      nextTemplateResult.value,
      created.value.version,
    );

    expect(firstUpdate.ok).toBe(true);
    expect(staleUpdate.ok).toBe(false);
    if (!staleUpdate.ok) {
      expect((staleUpdate.error as Error & { code?: string }).code).toBe(
        "TEMPLATE_VERSION_CONFLICT",
      );
    }
  });

  it("supports fields CRUD and ordering while keeping outsiders out", async () => {
    const ownerCollections = new SupabaseCollectionRepository(owner.client);
    const ownerFields = new SupabaseFieldRepository(owner.client);
    const outsiderFields = new SupabaseFieldRepository(outsider.client);

    const collection = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `fields_${crypto.randomUUID().slice(0, 6)}`,
        displayName: "Field playground",
      }),
    );

    if (!collection.ok) {
      throw collection.error;
    }

    const titleField = await ownerFields.create(
      makeField({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        name: "title",
        displayName: "Title",
        sortOrder: 0,
      }),
    );
    const statusField = await ownerFields.create(
      makeField({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        name: "status",
        fieldType: "ENUM",
        config: { options: ["draft", "published"] },
        sortOrder: 1,
      }),
    );

    expect(titleField.ok).toBe(true);
    expect(statusField.ok).toBe(true);

    await ownerFields.reorder(collection.value.id, [
      statusField.ok ? statusField.value.id : "",
      titleField.ok ? titleField.value.id : "",
    ]);

    const ordered = await ownerFields.findByCollectionId(collection.value.id);
    const outsiderVisible = await outsiderFields.findByCollectionId(collection.value.id);

    expect(ordered.ok).toBe(true);
    if (ordered.ok) {
      expect(ordered.value.map((field) => field.name)).toEqual(["status", "title"]);
    }
    expect(outsiderVisible.ok).toBe(true);
    if (outsiderVisible.ok) {
      expect(outsiderVisible.value).toEqual([]);
    }
  });

  it("supports record pagination, lookup and RLS by account", async () => {
    const ownerCollections = new SupabaseCollectionRepository(owner.client);
    const ownerRecords = new SupabaseRecordRepository(owner.client);
    const memberRecords = new SupabaseRecordRepository(member.client);
    const outsiderRecords = new SupabaseRecordRepository(outsider.client);

    const collection = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `records_${crypto.randomUUID().slice(0, 6)}`,
        displayName: "Record playground",
      }),
    );

    if (!collection.ok) {
      throw collection.error;
    }

    const created = await ownerRecords.create(
      makeRecord({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        accountId,
        createdBy: owner.id,
        data: {
          title: "Launch plan",
          status: "draft",
        },
      }),
    );

    expect(created.ok).toBe(true);

    const listedByMember = await memberRecords.findByCollectionId(collection.value.id, {
      page: 1,
      pageSize: 10,
      sortField: "title",
      sortDirection: "asc",
    });
    const foundByStatus = await memberRecords.findByFieldValue(
      collection.value.id,
      "status",
      "draft",
    );
    const count = await memberRecords.count(collection.value.id);
    const outsiderCreate = await outsiderRecords.create(
      makeRecord({
        id: crypto.randomUUID(),
        collectionId: collection.value.id,
        accountId,
        createdBy: outsider.id,
        data: {
          title: "Intrusion",
        },
      }),
    );

    expect(listedByMember.ok).toBe(true);
    if (listedByMember.ok) {
      expect(listedByMember.value.total).toBe(1);
      expect(listedByMember.value.data[0]?.data.title).toBe("Launch plan");
    }
    expect(foundByStatus.ok).toBe(true);
    if (foundByStatus.ok) {
      expect(foundByStatus.value).toHaveLength(1);
    }
    expect(count.ok).toBe(true);
    if (count.ok) {
      expect(count.value).toBe(1);
    }
    expect(outsiderCreate.ok).toBe(false);
  });

  it("enforces relation graph RLS and cardinality checks", async () => {
    const ownerCollections = new SupabaseCollectionRepository(owner.client);
    const ownerFields = new SupabaseFieldRepository(owner.client);
    const ownerRecords = new SupabaseRecordRepository(owner.client);
    const ownerRelations = new SupabaseRelationRepository(owner.client);
    const memberRelations = new SupabaseRelationRepository(member.client);
    const outsiderRelations = new SupabaseRelationRepository(outsider.client);

    const projects = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `projects_rel_${crypto.randomUUID().slice(0, 6)}`,
        displayName: "Projects relations",
      }),
    );
    const clients = await ownerCollections.create(
      makeCollection({
        id: crypto.randomUUID(),
        accountId,
        name: `clients_rel_${crypto.randomUUID().slice(0, 6)}`,
        displayName: "Clients relations",
      }),
    );

    if (!projects.ok) throw projects.error;
    if (!clients.ok) throw clients.error;

    const relationField = await ownerFields.create(
      makeField({
        id: crypto.randomUUID(),
        collectionId: projects.value.id,
        name: "client",
        fieldType: "RELATION",
        config: {
          targetCollectionId: clients.value.id,
          relationType: "ONE_TO_ONE",
          displayField: "name",
        },
      }),
    );

    if (!relationField.ok) {
      throw relationField.error;
    }

    const sourceRecord = await ownerRecords.create(
      makeRecord({
        id: crypto.randomUUID(),
        collectionId: projects.value.id,
        accountId,
        createdBy: owner.id,
        data: { name: "Project Alpha" },
      }),
    );
    const targetRecord = await ownerRecords.create(
      makeRecord({
        id: crypto.randomUUID(),
        collectionId: clients.value.id,
        accountId,
        createdBy: owner.id,
        data: { name: "Client A" },
      }),
    );

    if (!sourceRecord.ok) throw sourceRecord.error;
    if (!targetRecord.ok) throw targetRecord.error;

    const cardinality = await ownerRelations.validateCardinality({
      fieldId: relationField.value.id,
      sourceRecordId: sourceRecord.value.id,
      targetRecordIds: [targetRecord.value.id],
      relationType: "ONE_TO_ONE",
    });
    const sync = await ownerRelations.syncFieldRelationsForSource({
      accountId,
      fieldId: relationField.value.id,
      sourceRecordId: sourceRecord.value.id,
      targetRecordIds: [targetRecord.value.id],
    });

    expect(cardinality.ok).toBe(true);
    expect(sync.ok).toBe(true);

    const memberVisible = await memberRelations.listBySourceRecord(sourceRecord.value.id);
    expect(memberVisible.ok).toBe(true);
    if (memberVisible.ok) {
      expect(memberVisible.value).toHaveLength(1);
      expect(memberVisible.value[0]?.targetRecordId).toBe(targetRecord.value.id);
    }

    const outsiderSync = await outsiderRelations.syncFieldRelationsForSource({
      accountId,
      fieldId: relationField.value.id,
      sourceRecordId: sourceRecord.value.id,
      targetRecordIds: [targetRecord.value.id],
    });
    expect(outsiderSync.ok).toBe(false);
  });

  it("enforces storage access by workspace path prefix", async () => {
    const path = `${accountId}/integration-${crypto.randomUUID().slice(0, 6)}.txt`;
    const payload = new TextEncoder().encode("hello from integration");

    const ownerUpload = await owner.client.storage
      .from("record_files")
      .upload(path, payload, { contentType: "text/plain", upsert: true });

    expect(ownerUpload.error).toBeNull();

    const memberDownload = await member.client.storage.from("record_files").download(path);
    expect(memberDownload.error).toBeNull();

    const outsiderUpload = await outsider.client.storage
      .from("record_files")
      .upload(path, payload, { contentType: "text/plain", upsert: true });
    expect(outsiderUpload.error).not.toBeNull();

    await owner.client.storage.from("record_files").remove([path]);
  });
});
