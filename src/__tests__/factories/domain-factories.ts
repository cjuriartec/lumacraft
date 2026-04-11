import { User } from "@/modules/auth/domain/entities/user.entity";
import { Email } from "@/modules/auth/domain/value-objects/email.vo";
import { Collection } from "@/modules/collection/domain/entities/collection.entity";
import { Field } from "@/modules/collection/domain/entities/field.entity";
import { DataRecord } from "@/modules/collection/domain/entities/record.entity";
import { FieldConfig } from "@/modules/collection/domain/value-objects/field-config.vo";
import { FieldType, FieldTypeValue } from "@/modules/collection/domain/value-objects/field-type.vo";
import { RecordDocument } from "@/modules/document/domain/entities/record-document.entity";
import { Template } from "@/modules/template/domain/entities/template.entity";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";
import { Workspace } from "@/modules/workspace/domain/entities/workspace.entity";
import { WorkspaceMember } from "@/modules/workspace/domain/entities/workspace-member.entity";

let sequence = 0;

function nextSequence() {
  sequence += 1;
  return sequence;
}

function dateFor(sequenceValue: number) {
  return new Date(Date.UTC(2024, 0, sequenceValue, 12, 0, 0));
}

export function resetFactories() {
  sequence = 0;
}

export function makeId(prefix = "id") {
  return `${prefix}-${String(nextSequence()).padStart(4, "0")}`;
}

export function makeEmail(raw = `user${nextSequence()}@example.com`) {
  const result = Email.create(raw);

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeFieldType(value: FieldTypeValue = "TEXT") {
  const result = FieldType.create(value);

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeFieldConfig(fieldType: FieldTypeValue = "TEXT", raw?: Record<string, unknown>) {
  const baseConfig = raw ?? (fieldType === "ENUM" ? { options: ["draft", "published"] } : {});

  const result = FieldConfig.create(fieldType, baseConfig);

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeUser(
  overrides: Partial<{
    id: string;
    email: string | Email;
    fullName: string;
    avatarUrl: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const order = nextSequence();

  const result = User.create({
    id: overrides.id ?? `user-${String(order).padStart(4, "0")}`,
    email: overrides.email ?? makeEmail(`user${order}@example.com`),
    fullName: overrides.fullName ?? `Test User ${order}`,
    avatarUrl: overrides.avatarUrl ?? `https://example.com/avatar-${order}.png`,
    createdAt: overrides.createdAt ?? dateFor(order),
    updatedAt: overrides.updatedAt ?? dateFor(order),
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeWorkspace(
  overrides: Partial<{
    id: string;
    name: string;
    ownerId: string;
    settings: Record<string, unknown>;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const order = nextSequence();

  const result = Workspace.create({
    id: overrides.id ?? `workspace-${String(order).padStart(4, "0")}`,
    name: overrides.name ?? `Workspace ${order}`,
    ownerId: overrides.ownerId ?? `user-${String(order).padStart(4, "0")}`,
    settings: overrides.settings,
    isActive: overrides.isActive,
    createdAt: overrides.createdAt ?? dateFor(order),
    updatedAt: overrides.updatedAt ?? dateFor(order),
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeWorkspaceMember(
  overrides: Partial<{
    id: string;
    workspaceId: string;
    userId: string;
    roleId: string;
    userName: string;
    userEmail: string;
    userAvatarUrl: string;
    joinedAt: Date;
  }> = {},
) {
  const order = nextSequence();

  const result = WorkspaceMember.create({
    id: overrides.id ?? `member-${String(order).padStart(4, "0")}`,
    workspaceId: overrides.workspaceId ?? `workspace-${String(order).padStart(4, "0")}`,
    userId: overrides.userId ?? `user-${String(order).padStart(4, "0")}`,
    roleId: overrides.roleId ?? `role-${String(order).padStart(4, "0")}`,
    userName: overrides.userName ?? `Member ${order}`,
    userEmail: overrides.userEmail ?? `member${order}@example.com`,
    userAvatarUrl: overrides.userAvatarUrl,
    joinedAt: overrides.joinedAt ?? dateFor(order),
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeCollection(
  overrides: Partial<{
    id: string;
    accountId: string;
    name: string;
    displayName: string;
    description: string;
    icon: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const order = nextSequence();

  const result = Collection.create({
    id: overrides.id ?? `collection-${String(order).padStart(4, "0")}`,
    accountId: overrides.accountId ?? `workspace-${String(order).padStart(4, "0")}`,
    name: overrides.name ?? `collection_${order}`,
    displayName: overrides.displayName ?? `Collection ${order}`,
    description: overrides.description ?? `Description ${order}`,
    icon: overrides.icon ?? "database",
    createdAt: overrides.createdAt ?? dateFor(order),
    updatedAt: overrides.updatedAt ?? dateFor(order),
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeField(
  overrides: Partial<{
    id: string;
    collectionId: string;
    name: string;
    displayName: string;
    fieldType: FieldTypeValue;
    isRequired: boolean;
    isUnique: boolean;
    defaultValue: string;
    config: Record<string, unknown>;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const order = nextSequence();
  const fieldType = makeFieldType(overrides.fieldType ?? "TEXT");

  const result = Field.create({
    id: overrides.id ?? `field-${String(order).padStart(4, "0")}`,
    collectionId: overrides.collectionId ?? `collection-${String(order).padStart(4, "0")}`,
    name: overrides.name ?? `field_${order}`,
    displayName: overrides.displayName ?? `Field ${order}`,
    fieldType,
    isRequired: overrides.isRequired,
    isUnique: overrides.isUnique,
    defaultValue: overrides.defaultValue,
    config: makeFieldConfig(fieldType.value, overrides.config),
    sortOrder: overrides.sortOrder ?? order - 1,
    createdAt: overrides.createdAt ?? dateFor(order),
    updatedAt: overrides.updatedAt ?? dateFor(order),
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeRecord(
  overrides: Partial<{
    id: string;
    collectionId: string;
    accountId: string;
    data: Record<string, unknown>;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const order = nextSequence();

  return new DataRecord({
    id: overrides.id ?? `record-${String(order).padStart(4, "0")}`,
    collectionId: overrides.collectionId ?? `collection-${String(order).padStart(4, "0")}`,
    accountId: overrides.accountId ?? `workspace-${String(order).padStart(4, "0")}`,
    data: overrides.data ?? { title: `Record ${order}` },
    createdBy: overrides.createdBy ?? `user-${String(order).padStart(4, "0")}`,
    updatedBy: overrides.updatedBy,
    createdAt: overrides.createdAt ?? dateFor(order),
    updatedAt: overrides.updatedAt ?? dateFor(order),
  });
}

export function makeTemplate(
  overrides: Partial<{
    id: string;
    accountId: string;
    name: string;
    description: string;
    collectionId: string | null;
    blocks: TemplateBlocks;
    version: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const order = nextSequence();

  const result = Template.create({
    id: overrides.id ?? `template-${String(order).padStart(4, "0")}`,
    accountId: overrides.accountId ?? `workspace-${String(order).padStart(4, "0")}`,
    name: overrides.name ?? `Template ${order}`,
    description: overrides.description ?? `Template description ${order}`,
    collectionId:
      "collectionId" in overrides
        ? (overrides.collectionId ?? null)
        : `collection-${String(order).padStart(4, "0")}`,
    blocks: overrides.blocks ?? [
      {
        type: "p",
        children: [{ text: `Template ${order} content` }],
      },
    ],
    version: overrides.version ?? 1,
    createdBy: overrides.createdBy ?? `user-${String(order).padStart(4, "0")}`,
    createdAt: overrides.createdAt ?? dateFor(order),
    updatedAt: overrides.updatedAt ?? dateFor(order),
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}

export function makeRecordDocument(
  overrides: Partial<{
    id: string;
    accountId: string;
    collectionId: string;
    recordId: string;
    templateId: string;
    compiledBlocks: TemplateBlocks;
    editedBlocks: TemplateBlocks;
    sourceTemplateVersion: number;
    version: number;
    compiledAt: Date;
    lastEditedAt: Date;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  const order = nextSequence();

  const result = RecordDocument.create({
    id: overrides.id ?? `record-document-${String(order).padStart(4, "0")}`,
    accountId: overrides.accountId ?? `workspace-${String(order).padStart(4, "0")}`,
    collectionId: overrides.collectionId ?? `collection-${String(order).padStart(4, "0")}`,
    recordId: overrides.recordId ?? `record-${String(order).padStart(4, "0")}`,
    templateId: overrides.templateId ?? `template-${String(order).padStart(4, "0")}`,
    compiledBlocks: overrides.compiledBlocks ?? [
      {
        type: "p",
        children: [{ text: `Compiled ${order}` }],
      },
    ],
    editedBlocks: overrides.editedBlocks ??
      overrides.compiledBlocks ?? [
        {
          type: "p",
          children: [{ text: `Compiled ${order}` }],
        },
      ],
    sourceTemplateVersion: overrides.sourceTemplateVersion ?? 1,
    version: overrides.version ?? 1,
    compiledAt: overrides.compiledAt ?? dateFor(order),
    lastEditedAt: overrides.lastEditedAt ?? dateFor(order),
    createdBy: overrides.createdBy ?? `user-${String(order).padStart(4, "0")}`,
    updatedBy: overrides.updatedBy ?? `user-${String(order).padStart(4, "0")}`,
    createdAt: overrides.createdAt ?? dateFor(order),
    updatedAt: overrides.updatedAt ?? dateFor(order),
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.value;
}
