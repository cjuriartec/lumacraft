import { vi } from "vitest";

import { User } from "@/modules/auth/domain/entities/user.entity";
import { IAuthProvider } from "@/modules/auth/domain/ports/auth-provider.port";
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
import { Workspace } from "@/modules/workspace/domain/entities/workspace.entity";
import { IWorkspaceRepository } from "@/modules/workspace/domain/ports/workspace-repository.port";
import { DomainError, ok, Result } from "@/shared/domain/result";

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
          const value = record.data[filter.field];
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

  public create = vi.fn(async (record: DataRecord) => {
    if (this.createResult) return this.createResult;
    this.items.push(record);
    return ok(record);
  });

  public update = vi.fn(async (record: DataRecord) => {
    if (this.updateResult) return this.updateResult;
    this.items = this.items.map((item) => (item.id === record.id ? record : item));
    return ok(record);
  });

  public delete = vi.fn(async (id: string) => {
    if (this.deleteResult) return this.deleteResult;
    this.items = this.items.filter((record) => record.id !== id);
    return ok(undefined);
  });

  public count = vi.fn(async (collectionId: string) => {
    return (
      this.countResult ??
      ok(this.items.filter((record) => record.collectionId === collectionId).length)
    );
  });

  public findByFieldValue = vi.fn(
    async (collectionId: string, fieldName: string, value: unknown) => {
      if (this.findByFieldValueResult) return this.findByFieldValueResult;

      return ok(
        this.items.filter(
          (record) =>
            record.collectionId === collectionId &&
            String(record.data[fieldName]) === String(value),
        ),
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
