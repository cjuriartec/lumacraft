import { describe, expect, it, vi } from "vitest";

import { EagerLoadRecordUseCase } from "@/modules/collection/application/use-cases/eager-load-record.use-case";
import { IEagerLoadRepository } from "@/modules/collection/domain/ports/eager-load-repository.port";
import { DomainError, fail, ok } from "@/shared/domain/result";

function createMockRepository(data: {
  collections?: Record<string, { name: string; display_name: string }>;
  records?: Record<string, { id: string; data: Record<string, unknown> }>;
  fields?: Record<
    string,
    Array<{ id: string; name: string; field_type: string; config: Record<string, unknown> }>
  >;
  relations?: Record<string, Array<{ target_record_id: string }>>;
}) {
  const repo: IEagerLoadRepository = {
    getCollectionMetadata: vi.fn(async (id: string) => {
      const col = data.collections?.[id];
      return col ? ok(col) : fail(new DomainError("Not found", "NOT_FOUND"));
    }),
    getRecordData: vi.fn(async (id: string) => {
      const rec = data.records?.[id];
      return rec ? ok(rec) : fail(new DomainError("Not found", "NOT_FOUND"));
    }),
    getRelationFields: vi.fn(async (id: string) => {
      return ok(data.fields?.[id] || []);
    }),
    getRelations: vi.fn(async (fieldId: string, sourceId: string) => {
      const rels = data.relations?.[`${fieldId}:${sourceId}`] || [];
      return ok(rels.map((r) => r.target_record_id));
    }),
    getReverseRelations: vi.fn(async (_targetFieldId, _sourceId) => {
      return ok([]);
    }),
    resolveRecursive: vi.fn(
      async (recordId, collectionId, _depth, _visited, _includeFields, _includeRelationPaths) => {
        // For unit tests of the UseCase, we can either mock the whole recursion
        // or implement a simple version here. Since the UseCase now just delegates,
        // we check if it delegates correctly.

        const col = data.collections?.[collectionId];
        if (!col) return fail(new DomainError("Collection not found", "NOT_FOUND"));

        const rec = data.records?.[recordId];
        if (!rec) return fail(new DomainError("Record not found", "NOT_FOUND"));

        return ok({
          id: recordId,
          collectionId,
          collectionName: col.display_name || col.name,
          data: rec.data,
          relations: {},
        });
      },
    ),
  };
  return repo;
}

describe("EagerLoadRecordUseCase", () => {
  it("should return a flat record correctly via repository delegate", async () => {
    const repository = createMockRepository({
      collections: { "col-1": { name: "users", display_name: "Users" } },
      records: { "rec-1": { id: "rec-1", data: { name: "Test" } } },
    });

    const useCase = new EagerLoadRecordUseCase(repository);
    const result = await useCase.execute({
      recordId: "rec-1",
      collectionId: "col-1",
      depth: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("rec-1");
      expect(result.value.collectionName).toBe("Users");
      expect(result.value.data).toEqual({ name: "Test" });
      expect(repository.resolveRecursive).toHaveBeenCalled();
    }
  });

  it("should cap depth at MAX_DEPTH (5) when delegating to repository", async () => {
    const mockRepo: IEagerLoadRepository = {
      resolveRecursive: vi.fn(),
      getCollectionMetadata: vi.fn(),
      getRecordData: vi.fn(),
      getRelationFields: vi.fn(),
      getRelations: vi.fn(),
      getReverseRelations: vi.fn(),
    };

    const useCase = new EagerLoadRecordUseCase(mockRepo);
    await useCase.execute({
      recordId: "rec-1",
      collectionId: "col-1",
      depth: 100,
    });

    // Expect depth argument to be 5
    expect(mockRepo.resolveRecursive).toHaveBeenCalledWith(
      "rec-1",
      "col-1",
      5,
      expect.any(Set),
      undefined,
      undefined,
    );
  });

  it("should handle repository errors correctly", async () => {
    const repository = createMockRepository({});
    // Override mock to return failure
    repository.resolveRecursive = vi.fn(async () => fail(new DomainError("Repo error", "ERROR")));

    const useCase = new EagerLoadRecordUseCase(repository);
    const result = await useCase.execute({
      recordId: "any",
      collectionId: "any",
      depth: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Repo error");
    }
  });
});
