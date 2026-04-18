import { describe, expect, it, vi } from "vitest";

import { makeField, resetFactories } from "@/__tests__/factories/domain-factories";
import { InMemoryFieldRepository, InMemoryRecordRepository } from "@/__tests__/helpers/fakes";
import { CreateFieldUseCase } from "@/modules/collection/application/use-cases/create-field.use-case";
import { DeleteFieldUseCase } from "@/modules/collection/application/use-cases/delete-field.use-case";
import { GetFieldUseCase } from "@/modules/collection/application/use-cases/get-field.use-case";
import { ListFieldsUseCase } from "@/modules/collection/application/use-cases/list-fields.use-case";
import { UpdateFieldUseCase } from "@/modules/collection/application/use-cases/update-field.use-case";

describe("field use cases", () => {
  it("creates valid fields through the repository", async () => {
    resetFactories();
    const repository = new InMemoryFieldRepository();
    const useCase = new CreateFieldUseCase(repository);
    const uuidSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue("field-123");

    const result = await useCase.execute({
      collectionId: "collection-1",
      name: "status",
      displayName: "Status",
      fieldType: "ENUM",
      config: { options: ["draft", "published"] },
    });

    expect(result.ok).toBe(true);
    expect(repository.create).toHaveBeenCalledOnce();
    const created = repository.create.mock.calls[0][0];
    expect(created.id).toBe("field-123");
    expect(created.fieldType.value).toBe("ENUM");
    uuidSpy.mockRestore();
  });

  it("rejects invalid field types before hitting persistence", async () => {
    const repository = new InMemoryFieldRepository();
    const useCase = new CreateFieldUseCase(repository);

    const result = await useCase.execute({
      collectionId: "collection-1",
      name: "relation",
      fieldType: "CURRENCY",
    });

    expect(result.ok).toBe(false);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("updates fields with validated config", async () => {
    const repository = new InMemoryFieldRepository();
    const useCase = new UpdateFieldUseCase(repository);

    const result = await useCase.execute({
      id: "field-1",
      collectionId: "collection-1",
      name: "budget",
      displayName: "Budget",
      fieldType: "NUMBER",
      config: { min: 0, decimals: 2 },
      isRequired: true,
    });

    expect(result.ok).toBe(true);
    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update.mock.calls[0][0].fieldType.value).toBe("NUMBER");
  });

  it("requires displayField when creating relation fields", async () => {
    const repository = new InMemoryFieldRepository();
    const useCase = new CreateFieldUseCase(repository);

    const missingDisplayField = await useCase.execute({
      collectionId: "collection-1",
      name: "client",
      displayName: "Client",
      fieldType: "RELATION",
      config: {
        targetCollectionId: "4f83f5eb-48ad-4c8f-aebb-f8030d7d32f9",
        relationType: "ONE_TO_ONE",
      },
    });

    expect(missingDisplayField.ok).toBe(false);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates image fields with image config", async () => {
    const repository = new InMemoryFieldRepository();
    const useCase = new CreateFieldUseCase(repository);
    const uuidSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue("field-image-1");

    const result = await useCase.execute({
      collectionId: "collection-1",
      name: "cover",
      displayName: "Cover",
      fieldType: "IMAGE",
      config: {
        allowedMimeTypes: ["image/png", "image/jpeg"],
        maxSizeBytes: 1024 * 1024,
      },
    });

    expect(result.ok).toBe(true);
    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.create.mock.calls[0][0].fieldType.value).toBe("IMAGE");
    uuidSpy.mockRestore();
  });

  it("normalizes new relation fields as bidirectional and creates the reverse lookup", async () => {
    const repository = new InMemoryFieldRepository();
    const useCase = new CreateFieldUseCase(repository);
    const uuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("33333333-3333-4333-8333-333333333333")
      .mockReturnValueOnce("44444444-4444-4444-8444-444444444444");

    const result = await useCase.execute({
      collectionId: "11111111-1111-4111-8111-111111111111",
      name: "client",
      displayName: "Client",
      fieldType: "RELATION",
      config: {
        targetCollectionId: "22222222-2222-4222-8222-222222222222",
        relationType: "MANY_TO_ONE",
        displayField: "name",
        bidirectional: false,
        inverseFieldName: "orders",
      },
    });

    expect(result.ok).toBe(true);
    expect(repository.create).toHaveBeenCalledTimes(2);
    expect(repository.create.mock.calls[0][0].config?.value).toMatchObject({
      bidirectional: true,
      inverseFieldName: "orders",
    });
    expect(repository.create.mock.calls[1][0].fieldType.value).toBe("REVERSE_LOOKUP");
    expect(repository.create.mock.calls[1][0].config?.value).toMatchObject({
      hidden: true,
    });
    uuidSpy.mockRestore();
  });

  it("lists and deletes fields via the repository port", async () => {
    resetFactories();
    const field = makeField({ collectionId: "collection-1" });
    const fieldRepository = new InMemoryFieldRepository([field]);
    const recordRepository = new InMemoryRecordRepository();

    const listUseCase = new ListFieldsUseCase(fieldRepository);
    const deleteUseCase = new DeleteFieldUseCase(fieldRepository, recordRepository);

    const listed = await listUseCase.execute("collection-1");
    const deleted = await deleteUseCase.execute(field.id);

    expect(listed.ok).toBe(true);
    expect(deleted.ok).toBe(true);
    expect(fieldRepository.delete).toHaveBeenCalledWith(field.id);
  });

  it("retrieves a field by ID", async () => {
    resetFactories();
    const field = makeField();
    const repository = new InMemoryFieldRepository([field]);
    const useCase = new GetFieldUseCase(repository);

    const result = await useCase.execute(field.id);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.id).toBe(field.id);
    }
    expect(repository.findById).toHaveBeenCalledWith(field.id);
  });
});
