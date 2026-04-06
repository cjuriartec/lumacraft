import { describe, expect, it, vi } from "vitest";

import { makeTemplate, resetFactories } from "@/__tests__/factories/domain-factories";
import { InMemoryTemplateRepository } from "@/__tests__/helpers/fakes";
import { CreateTemplateUseCase } from "@/modules/template/application/use-cases/create-template.use-case";
import { DeleteTemplateUseCase } from "@/modules/template/application/use-cases/delete-template.use-case";
import { GetTemplateUseCase } from "@/modules/template/application/use-cases/get-template.use-case";
import { ListTemplatesUseCase } from "@/modules/template/application/use-cases/list-templates.use-case";
import { UpdateTemplateUseCase } from "@/modules/template/application/use-cases/update-template.use-case";
import { DomainError, fail } from "@/shared/domain/result";

describe("template use cases", () => {
  it("creates a template entity before persisting it", async () => {
    resetFactories();
    const repository = new InMemoryTemplateRepository();
    const useCase = new CreateTemplateUseCase(repository);
    const uuidSpy = vi.spyOn(crypto, "randomUUID").mockReturnValue("template-123");

    const result = await useCase.execute({
      accountId: "workspace-1",
      name: "Plantilla Cotizacion",
      description: "Documento comercial",
      collectionId: "collection-1",
    });

    expect(result.ok).toBe(true);
    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.create.mock.calls[0]?.[0].id).toBe("template-123");
    uuidSpy.mockRestore();
  });

  it("lists templates by account", async () => {
    resetFactories();
    const template = makeTemplate({ accountId: "workspace-1" });
    const repository = new InMemoryTemplateRepository([template]);
    const useCase = new ListTemplatesUseCase(repository);

    const result = await useCase.execute("workspace-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([template]);
    }
  });

  it("gets template by id", async () => {
    resetFactories();
    const template = makeTemplate({ id: "template-1", accountId: "workspace-1" });
    const repository = new InMemoryTemplateRepository([template]);
    const useCase = new GetTemplateUseCase(repository);

    const result = await useCase.execute("template-1");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value?.id).toBe("template-1");
    }
  });

  it("deletes templates by id", async () => {
    resetFactories();
    const template = makeTemplate({ id: "template-1" });
    const repository = new InMemoryTemplateRepository([template]);
    const useCase = new DeleteTemplateUseCase(repository);

    const result = await useCase.execute("template-1");

    expect(result.ok).toBe(true);
    expect(repository.delete).toHaveBeenCalledWith("template-1");
  });

  it("updates template and increments version using optimistic expectedVersion", async () => {
    resetFactories();
    const template = makeTemplate({
      id: "template-1",
      accountId: "workspace-1",
      version: 1,
      name: "Plantilla 1",
    });
    const repository = new InMemoryTemplateRepository([template]);
    const useCase = new UpdateTemplateUseCase(repository);

    const result = await useCase.execute({
      id: "template-1",
      accountId: "workspace-1",
      name: "Plantilla 1 actualizada",
      description: "Nueva descripcion",
      collectionId: template.collectionId,
      blocks: template.blocks,
    });

    expect(result.ok).toBe(true);
    expect(repository.update).toHaveBeenCalledOnce();
    expect(repository.update.mock.calls[0]?.[1]).toBe(1);
    if (result.ok) {
      expect(result.value.version).toBe(2);
      expect(result.value.name).toBe("Plantilla 1 actualizada");
    }
  });

  it("rejects update when template belongs to another account", async () => {
    resetFactories();
    const template = makeTemplate({
      id: "template-1",
      accountId: "workspace-1",
    });
    const repository = new InMemoryTemplateRepository([template]);
    const useCase = new UpdateTemplateUseCase(repository);

    const result = await useCase.execute({
      id: "template-1",
      accountId: "workspace-2",
      name: "Plantilla",
      description: template.description,
      collectionId: template.collectionId,
      blocks: template.blocks,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("TEMPLATE_ACCOUNT_MISMATCH");
    }
  });

  it("propagates repository errors from findById", async () => {
    resetFactories();
    const repository = new InMemoryTemplateRepository();
    repository.findByIdResult = fail(new DomainError("DB exploded", "DB_ERROR"));
    const useCase = new UpdateTemplateUseCase(repository);

    const result = await useCase.execute({
      id: "template-1",
      accountId: "workspace-1",
      name: "Plantilla",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("DB_ERROR");
    }
  });

  it("propagates optimistic lock conflicts from repository", async () => {
    resetFactories();
    const template = makeTemplate({
      id: "template-1",
      accountId: "workspace-1",
      version: 1,
    });
    const repository = new InMemoryTemplateRepository([template]);
    repository.updateResult = fail(
      new DomainError("Template version conflict", "TEMPLATE_VERSION_CONFLICT"),
    );
    const useCase = new UpdateTemplateUseCase(repository);

    const result = await useCase.execute({
      id: "template-1",
      accountId: "workspace-1",
      name: "Plantilla conflictiva",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect((result.error as Error & { code?: string }).code).toBe("TEMPLATE_VERSION_CONFLICT");
    }
  });
});
