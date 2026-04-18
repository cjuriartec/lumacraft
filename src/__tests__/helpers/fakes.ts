import { vi } from "vitest";

import { User } from "@/modules/auth/domain/entities/user.entity";
import { UserProfile } from "@/modules/auth/domain/entities/user-profile.entity";
import { IAuthProvider } from "@/modules/auth/domain/ports/auth-provider.port";
import { IUserProfileRepository } from "@/modules/auth/domain/ports/user-profile-repository.port";
import { Collection } from "@/modules/collection/domain/entities/collection.entity";
import { Field } from "@/modules/collection/domain/entities/field.entity";
import { DataRecord } from "@/modules/collection/domain/entities/record.entity";
import { ICollectionRepository } from "@/modules/collection/domain/ports/collection-repository.port";
import { IFieldRepository } from "@/modules/collection/domain/ports/field-repository.port";
import { IRecordRepository } from "@/modules/collection/domain/ports/record-repository.port";
import { IRelationRepository } from "@/modules/collection/domain/ports/relation-repository.port";
import { PaginationOptions } from "@/modules/collection/domain/types/pagination.types";
import {
  RecordRelation,
  SyncFieldRelationsRequest,
  ValidateCardinalityRequest,
} from "@/modules/collection/domain/types/relation.types";
import { RecordDocument } from "@/modules/document/domain/entities/record-document.entity";
import { IRecordDocumentRepository } from "@/modules/document/domain/ports/record-document-repository.port";
import { Template } from "@/modules/template/domain/entities/template.entity";
import {
  ITemplateRepository,
  TemplateHeader,
} from "@/modules/template/domain/ports/template-repository.port";
import { Workspace } from "@/modules/workspace/domain/entities/workspace.entity";
import { IWorkspaceRepository } from "@/modules/workspace/domain/ports/workspace-repository.port";
import { DomainError, fail, ok, Result } from "@/shared/domain/result";

function compareValues(left: unknown, right: unknown) {
  if (left === right) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  return String(left).localeCompare(String(right), "en");
}

export class FakeAuthProvider implements IAuthProvider {
  private listeners = new Set<(user: User | null) => void>();

  public signInResult: Result<void> = ok(undefined);
  public signOutResult: Result<void> = ok(undefined);
  public currentUserResult: Result<User | null> = ok(null);

  public signInWithGoogle = vi.fn(async () => this.signInResult);
  public signOut = vi.fn(async () => this.signOutResult);
  public getCurrentUser = vi.fn(async () => this.currentUserResult);
  public onAuthStateChange = vi.fn((callback: (user: User | null) => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  });

  emitAuthState(user: User | null) {
    for (const listener of this.listeners) {
      listener(user);
    }
  }
}

export class InMemoryWorkspaceRepository implements IWorkspaceRepository {
  constructor(public items: Workspace[] = []) {}

  public findByIdResult?: Result<Workspace | null>;
  public findByUserIdResult?: Result<Workspace[]>;
  public createResult?: Result<Workspace>;
  public updateResult?: Result<Workspace>;

  public findById = vi.fn(async (id: string) => {
    return this.findByIdResult ?? ok(this.items.find((workspace) => workspace.id === id) ?? null);
  });

  public findByUserId = vi.fn(async (userId: string) => {
    return (
      this.findByUserIdResult ?? ok(this.items.filter((workspace) => workspace.ownerId === userId))
    );
  });

  public create = vi.fn(async (workspace: Workspace) => {
    if (this.createResult) return this.createResult;
    this.items.push(workspace);
    return ok(workspace);
  });

  public update = vi.fn(async (workspace: Workspace) => {
    if (this.updateResult) return this.updateResult;
    this.items = this.items.map((item) => (item.id === workspace.id ? workspace : item));
    return ok(workspace);
  });
}

export class InMemoryCollectionRepository implements ICollectionRepository {
  constructor(public items: Collection[] = []) {}

  public findByIdResult?: Result<Collection | null>;
  public findByAccountIdResult?: Result<Collection[]>;
  public createResult?: Result<Collection>;
  public updateResult?: Result<Collection>;
  public deleteResult?: Result<void>;

  public findById = vi.fn(async (id: string) => {
    return this.findByIdResult ?? ok(this.items.find((collection) => collection.id === id) ?? null);
  });

  public findByAccountId = vi.fn(async (accountId: string) => {
    return (
      this.findByAccountIdResult ??
      ok(this.items.filter((collection) => collection.accountId === accountId))
    );
  });

  public create = vi.fn(async (collection: Collection) => {
    if (this.createResult) return this.createResult;
    this.items.push(collection);
    return ok(collection);
  });

  public update = vi.fn(async (collection: Collection) => {
    if (this.updateResult) return this.updateResult;
    this.items = this.items.map((item) => (item.id === collection.id ? collection : item));
    return ok(collection);
  });

  public delete = vi.fn(async (id: string) => {
    if (this.deleteResult) return this.deleteResult;
    this.items = this.items.filter((collection) => collection.id !== id);
    return ok(undefined);
  });

  public count = vi.fn(async (accountId: string) => {
    return ok(this.items.filter((col) => col.accountId === accountId).length);
  });
}

export class InMemoryTemplateRepository implements ITemplateRepository {
  constructor(public items: Template[] = []) {}

  public findByIdResult?: Result<Template | null>;
  public findHeaderByIdResult?: Result<TemplateHeader | null>;
  public findByAccountIdResult?: Result<Template[]>;
  public createResult?: Result<Template>;
  public updateResult?: Result<Template>;
  public deleteResult?: Result<void>;

  public findById = vi.fn(async (id: string) => {
    return this.findByIdResult ?? ok(this.items.find((template) => template.id === id) ?? null);
  });

  public findHeaderById = vi.fn(async (id: string) => {
    if (this.findHeaderByIdResult) {
      return this.findHeaderByIdResult;
    }

    const template = this.items.find((item) => item.id === id) ?? null;
    if (!template) {
      return ok(null);
    }

    return ok({
      id: template.id,
      accountId: template.accountId,
      collectionId: template.collectionId ?? null,
      version: template.version,
    });
  });

  public findByAccountId = vi.fn(async (accountId: string) => {
    return (
      this.findByAccountIdResult ?? ok(this.items.filter((item) => item.accountId === accountId))
    );
  });

  public create = vi.fn(async (template: Template) => {
    if (this.createResult) return this.createResult;
    this.items.push(template);
    return ok(template);
  });

  public update = vi.fn(async (template: Template, expectedVersion: number) => {
    if (this.updateResult) return this.updateResult;

    const existing = this.items.find((item) => item.id === template.id);
    if (!existing) {
      return fail(new DomainError("Template not found", "NOT_FOUND"));
    }

    if (existing.version !== expectedVersion) {
      return fail(new DomainError("Template version conflict", "TEMPLATE_VERSION_CONFLICT"));
    }

    this.items = this.items.map((item) => (item.id === template.id ? template : item));
    return ok(template);
  });

  public delete = vi.fn(async (id: string) => {
    if (this.deleteResult) return this.deleteResult;
    this.items = this.items.filter((template) => template.id !== id);
    return ok(undefined);
  });

  public count = vi.fn(async (accountId: string) => {
    return ok(this.items.filter((item) => item.accountId === accountId).length);
  });
}

export class InMemoryRecordDocumentRepository implements IRecordDocumentRepository {
  constructor(public items: RecordDocument[] = []) {}

  public findByTemplateAndRecordResult?: Result<RecordDocument | null, DomainError>;
  public createResult?: Result<RecordDocument, DomainError>;
  public updateResult?: Result<RecordDocument, DomainError>;

  public findByTemplateAndRecord = vi.fn(async (templateId: string, recordId: string) => {
    return (
      this.findByTemplateAndRecordResult ??
      ok(
        this.items.find(
          (document) => document.templateId === templateId && document.recordId === recordId,
        ) ?? null,
      )
    );
  });

  public create = vi.fn(async (document: RecordDocument) => {
    if (this.createResult) return this.createResult;
    this.items.push(document);
    return ok(document);
  });

  public update = vi.fn(async (document: RecordDocument, expectedVersion: number) => {
    if (this.updateResult) return this.updateResult;

    const existing = this.items.find((item) => item.id === document.id);
    if (!existing) {
      return fail(new DomainError("Record document not found", "DOCUMENT_NOT_FOUND"));
    }

    if (existing.version !== expectedVersion) {
      return fail(new DomainError("Record document version conflict", "DOCUMENT_VERSION_CONFLICT"));
    }

    this.items = this.items.map((item) => (item.id === document.id ? document : item));
    return ok(document);
  });
}

export class InMemoryFieldRepository implements IFieldRepository {
  constructor(public items: Field[] = []) {}

  public findByCollectionIdResult?: Result<Field[]>;
  public findByIdResult?: Result<Field | null>;
  public createResult?: Result<Field>;
  public updateResult?: Result<Field>;
  public deleteResult?: Result<void>;
  public reorderResult?: Result<void>;

  public findByCollectionId = vi.fn(async (collectionId: string) => {
    const fields = this.items
      .filter((field) => field.collectionId === collectionId)
      .sort((left, right) => left.sortOrder - right.sortOrder);

    return this.findByCollectionIdResult ?? ok(fields);
  });

  public findByAccountId = vi.fn(async (_accountId: string) => {
    return ok(this.items);
  });

  public findById = vi.fn(async (id: string) => {
    return this.findByIdResult ?? ok(this.items.find((field) => field.id === id) ?? null);
  });

  public create = vi.fn(async (field: Field) => {
    if (this.createResult) return this.createResult;
    this.items.push(field);
    return ok(field);
  });

  public update = vi.fn(async (field: Field) => {
    if (this.updateResult) return this.updateResult;
    this.items = this.items.map((item) => (item.id === field.id ? field : item));
    return ok(field);
  });

  public delete = vi.fn(async (id: string) => {
    if (this.deleteResult) return this.deleteResult;
    this.items = this.items.filter((field) => field.id !== id);
    return ok(undefined);
  });

  public reorder = vi.fn(async (_collectionId: string, fieldIds: string[]) => {
    if (this.reorderResult) return this.reorderResult;

    this.items = this.items.map((field) => {
      const nextIndex = fieldIds.indexOf(field.id);

      if (nextIndex === -1) {
        return field;
      }

      const result = Field.create({
        ...field.toJSON(),
        fieldType: field.fieldType,
        config: field.config,
        sortOrder: nextIndex,
      });

      if (!result.ok) {
        throw new Error(`Fakes reorder failed: ${result.error.message}`);
      }

      return result.value;
    });

    return ok(undefined);
  });
}

export class InMemoryRecordRepository implements IRecordRepository {
  constructor(public items: DataRecord[] = []) {}

  public findByCollectionIdResult?: Result<{
    data: DataRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  public findByIdResult?: Result<DataRecord | null>;
  public createResult?: Result<DataRecord>;
  public updateResult?: Result<DataRecord>;
  public deleteResult?: Result<void>;
  public countResult?: Result<number>;
  public findByFieldValueResult?: Result<DataRecord[]>;

  public findByCollectionId = vi.fn(async (collectionId: string, options: PaginationOptions) => {
    if (this.findByCollectionIdResult) return this.findByCollectionIdResult;

    let filtered = this.items.filter((record) => record.collectionId === collectionId);

    if (options.search && options.searchFields && options.searchFields.length > 0) {
      const normalized = options.search.toLowerCase();
      filtered = filtered.filter((record) =>
        options.searchFields!.some((field) =>
          String(record.data[field] ?? "")
            .toLowerCase()
            .includes(normalized),
        ),
      );
    }

    if (options.filters && options.filters.length > 0) {
      filtered = filtered.filter((record) => {
        return options.filters!.every((filter) => {
          const nativeValue = (() => {
            switch (filter.field) {
              case "id":
                return record.id;
              case "collection_id":
                return record.collectionId;
              case "account_id":
                return record.accountId;
              case "created_at":
                return record.createdAt.toISOString();
              case "updated_at":
                return record.updatedAt.toISOString();
              case "created_by":
                return record.createdBy;
              case "updated_by":
                return record.updatedBy;
              default:
                return undefined;
            }
          })();
          const value = nativeValue ?? record.data[filter.field];
          switch (filter.operator) {
            case "eq":
              return String(value) === String(filter.value);
            case "neq":
              return String(value) !== String(filter.value);
            case "contains":
              return String(value ?? "")
                .toLowerCase()
                .includes(String(filter.value).toLowerCase());
            case "gt":
              return Number(value) > Number(filter.value);
            case "gte":
              return Number(value) >= Number(filter.value);
            case "lt":
              return Number(value) < Number(filter.value);
            case "lte":
              return Number(value) <= Number(filter.value);
            case "in":
              return (
                Array.isArray(filter.value) && filter.value.map(String).includes(String(value))
              );
            default:
              return true;
          }
        });
      });
    }

    const sorted = [...filtered].sort((left, right) => {
      if (!options.sortField || options.sortField === "created_at") {
        const leftValue = left.createdAt.getTime();
        const rightValue = right.createdAt.getTime();
        return options.sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      const leftValue = left.data[options.sortField];
      const rightValue = right.data[options.sortField];
      const base = compareValues(leftValue, rightValue);
      return options.sortDirection === "asc" ? base : -base;
    });

    const from = (options.page - 1) * options.pageSize;
    const page = sorted.slice(from, from + options.pageSize);

    return ok({
      data: page,
      total: sorted.length,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.max(1, Math.ceil(sorted.length / options.pageSize)),
    });
  });

  public findById = vi.fn(async (id: string) => {
    return this.findByIdResult ?? ok(this.items.find((record) => record.id === id) ?? null);
  });

  public create = vi.fn(async (record: DataRecord, _omitFields?: string[]) => {
    if (this.createResult) return this.createResult;
    this.items.push(record);
    return ok(record);
  });

  public update = vi.fn(async (record: DataRecord, _omitFields?: string[]) => {
    if (this.updateResult) return this.updateResult;
    this.items = this.items.map((item) => (item.id === record.id ? record : item));
    return ok(record);
  });

  public delete = vi.fn(async (id: string) => {
    if (this.deleteResult) return this.deleteResult;
    this.items = this.items.filter((record) => record.id !== id);
    return ok(undefined);
  });

  public deleteFieldData = vi.fn(async (_collectionId: string, _fieldName: string) => {
    return ok(undefined);
  });

  public count = vi.fn(async (collectionId: string) => {
    return (
      this.countResult ??
      ok(this.items.filter((record) => record.collectionId === collectionId).length)
    );
  });

  public countAll = vi.fn(async (_accountId: string) => {
    return ok(this.items.length);
  });

  public findByFieldValue = vi.fn(
    async (collectionId: string, fieldName: string, value: unknown | unknown[]) => {
      if (this.findByFieldValueResult) return this.findByFieldValueResult;

      return ok(
        this.items.filter((record) => {
          const isSameCollection = record.collectionId === collectionId;
          const recordValue = record.data[fieldName];

          if (Array.isArray(value)) {
            const valuesSet = new Set(value.map((v) => String(v)));
            return isSameCollection && valuesSet.has(String(recordValue));
          }

          return isSameCollection && String(recordValue) === String(value);
        }),
      );
    },
  );
}

export class InMemoryRelationRepository implements IRelationRepository {
  constructor(public items: RecordRelation[] = []) {}

  public listBySourceRecordResult?: Result<RecordRelation[]>;
  public validateCardinalityResult?: Result<void>;
  public syncFieldRelationsForSourceResult?: Result<void>;

  public listBySourceRecord = vi.fn(async (sourceRecordId: string) => {
    return (
      this.listBySourceRecordResult ??
      ok(this.items.filter((relation) => relation.sourceRecordId === sourceRecordId))
    );
  });

  public listByFieldAndTargetRecordIds = vi.fn(async (fieldId: string, targetRecordIds: string[]) => {
    return ok(
      this.items.filter(
        (relation) =>
          relation.fieldId === fieldId && targetRecordIds.includes(relation.targetRecordId),
      ),
    );
  });

  public validateCardinality = vi.fn(async (request: ValidateCardinalityRequest) => {
    if (this.validateCardinalityResult) return this.validateCardinalityResult;

    if (request.relationType === "ONE_TO_ONE" && request.targetRecordIds.length > 1) {
      return {
        ok: false,
        error: new DomainError("ONE_TO_ONE relation cannot contain multiple targets"),
      } as const;
    }

    if (request.relationType === "ONE_TO_ONE" || request.relationType === "ONE_TO_MANY") {
      const hasConflict = this.items.some(
        (relation) =>
          relation.fieldId === request.fieldId &&
          request.targetRecordIds.includes(relation.targetRecordId) &&
          relation.sourceRecordId !== request.sourceRecordId,
      );

      if (hasConflict) {
        return {
          ok: false,
          error: new DomainError("Target record already linked for this relation cardinality"),
        } as const;
      }
    }

    return ok(undefined);
  });

  public syncFieldRelationsForSource = vi.fn(async (request: SyncFieldRelationsRequest) => {
    if (this.syncFieldRelationsForSourceResult) return this.syncFieldRelationsForSourceResult;

    const targetIds = [...new Set(request.targetRecordIds)];
    const base = this.items.filter(
      (relation) =>
        !(
          relation.fieldId === request.fieldId && relation.sourceRecordId === request.sourceRecordId
        ),
    );
    const next = targetIds.map((targetId, index) => ({
      id: `relation-${request.fieldId}-${request.sourceRecordId}-${index}`,
      accountId: request.accountId,
      fieldId: request.fieldId,
      sourceRecordId: request.sourceRecordId,
      targetRecordId: targetId,
      createdAt: new Date(),
    }));

    this.items = [...base, ...next];
    return ok(undefined);
  });
}

export class InMemoryUserProfileRepository implements IUserProfileRepository {
  constructor(public items: UserProfile[] = []) {}

  public findByIdResult?: Result<UserProfile>;
  public saveResult?: Result<void>;

  public findById = vi.fn(async (userId: string) => {
    if (this.findByIdResult) return this.findByIdResult;
    const item = this.items.find((i) => i.id === userId);
    return item ? ok(item) : UserProfile.create({ id: userId });
  });

  public save = vi.fn(async (profile: UserProfile) => {
    if (this.saveResult) return this.saveResult;
    this.items = this.items.map((i) => (i.id === profile.id ? profile : i));
    if (!this.items.find((i) => i.id === profile.id)) {
      this.items.push(profile);
    }
    return ok(undefined);
  });
}
