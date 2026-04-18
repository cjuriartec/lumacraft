import { describe, expect, it, vi } from "vitest";

import { makeCollection, resetFactories } from "@/__tests__/factories/domain-factories";
import { InMemoryCollectionRepository } from "@/__tests__/helpers/fakes";
import { CreateCollectionUseCase } from "@/modules/collection/application/use-cases/create-collection.use-case";
import { DeleteCollectionUseCase } from "@/modules/collection/application/use-cases/delete-collection.use-case";
import { GetCollectionUseCase } from "@/modules/collection/application/use-cases/get-collection.use-case";
import { ListCollectionsUseCase } from "@/modules/collection/application/use-cases/list-collections.use-case";
import { UpdateCollectionUseCase } from "@/modules/collection/application/use-cases/update-collection.use-case";

describe("collection use cases", () => {
  it("creates a collection entity before persisting it", async () => {
    resetFactories();
    const repository = new InMemoryCollectionRepository();
    const useCase = new CreateCollectionUseCase(repository);
    const uuidSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue("collection-123");

    const result = await useCase.execute({
      accountId: "workspace-1",
      name: "projects",
      displayName: "Projects",
      description: "Tracks active projects",
      icon: "database",
    });

    expect(result.ok).toBe(true);
    expect(repository.create).toHaveBeenCalledOnce();
    const created = repository.create.mock.calls[0][0];
    expect(created.id).toBe("collection-123");
    expect(created.accountId).toBe("workspace-1");
    uuidSpy.mockRestore();
  });

  it("lists collections by account", async () => {
    resetFactories();
    const collection = makeCollection({ accountId: "workspace-1" });
    const repository = new InMemoryCollectionRepository([collection]);
    const useCase = new ListCollectionsUseCase(repository);

    const result = await useCase.execute("workspace-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([collection]);
    }
  });

  it("deletes collections by id", async () => {
    resetFactories();
    const collection = makeCollection({ id: "collection-1" });
    const repository = new InMemoryCollectionRepository([collection]);
    const useCase = new DeleteCollectionUseCase(repository);

    const result = await useCase.execute("collection-1");

    expect(result.ok).toBe(true);
    expect(repository.delete).toHaveBeenCalledWith("collection-1");
  });

  it("gets collection by id", async () => {
    resetFactories();
    const collection = makeCollection({ id: "collection-1", accountId: "workspace-1" });
    const repository = new InMemoryCollectionRepository([collection]);
    const useCase = new GetCollectionUseCase(repository);

    const result = await useCase.execute("collection-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.id).toBe("collection-1");
    }
  });

  it("updates collection when account matches", async () => {
    resetFactories();
    const collection = makeCollection({
      id: "collection-1",
      accountId: "workspace-1",
      name: "projects",
      displayName: "Projects",
    });
    const repository = new InMemoryCollectionRepository([collection]);
    const useCase = new UpdateCollectionUseCase(repository);

    const result = await useCase.execute({
      id: "collection-1",
      accountId: "workspace-1",
      name: "projects",
      displayName: "Projects Updated",
      primaryFieldName: "title",
      settings: { hideIdColumn: true },
    });

    expect(result.ok).toBe(true);
    expect(repository.update).toHaveBeenCalledOnce();
    if (result.ok) {
      expect(result.value.displayName).toBe("Projects Updated");
      expect(result.value.primaryFieldName).toBe("title");
      expect(result.value.settings.hideIdColumn).toBe(true);
    }
  });

  it("rejects update when collection belongs to another account", async () => {
    resetFactories();
    const collection = makeCollection({
      id: "collection-1",
      accountId: "workspace-1",
    });
    const repository = new InMemoryCollectionRepository([collection]);
    const useCase = new UpdateCollectionUseCase(repository);

    const result = await useCase.execute({
      id: "collection-1",
      accountId: "workspace-2",
      name: "projects",
      displayName: "Projects Updated",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("COLLECTION_ACCOUNT_MISMATCH");
    }
  });
});
