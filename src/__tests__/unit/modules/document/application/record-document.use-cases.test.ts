import { describe, expect, it, vi } from "vitest";

import { makeRecordDocument, resetFactories } from "@/__tests__/factories/domain-factories";
import { InMemoryRecordDocumentRepository } from "@/__tests__/helpers/fakes";
import { CompileRecordDocumentIfMissingUseCase } from "@/modules/document/application/use-cases/compile-record-document-if-missing.use-case";
import { RegenerateRecordDocumentUseCase } from "@/modules/document/application/use-cases/regenerate-record-document.use-case";
import { RenderRecordDocumentPdfUseCase } from "@/modules/document/application/use-cases/render-record-document-pdf.use-case";
import { SaveRecordDocumentEditsUseCase } from "@/modules/document/application/use-cases/save-record-document-edits.use-case";
import { DomainError, fail, ok } from "@/shared/domain/result";

describe("Record document use cases", () => {
  it("compileIfMissing compiles only once and returns the existing persisted document afterwards", async () => {
    resetFactories();

    const previewBlocks = [{ type: "p", children: [{ text: "Compilado" }] }];
    const repository = new InMemoryRecordDocumentRepository();
    const compilePreview = {
      execute: vi.fn(async () =>
        ok({
          requestId: "req-1",
          warnings: [],
          blocks: previewBlocks,
        }),
      ),
    };

    const useCase = new CompileRecordDocumentIfMissingUseCase(repository);
    const firstResult = await useCase.execute({
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      templateId: "template-1",
      templateVersion: 3,
      userId: "user-1",
      compilePreview,
    });

    expect(firstResult.ok).toBe(true);
    if (!firstResult.ok) {
      throw firstResult.error;
    }

    expect(firstResult.value.compiled).toBe(true);
    expect(firstResult.value.document.compiledBlocks).toEqual(previewBlocks);
    expect(firstResult.value.document.editedBlocks).toEqual(previewBlocks);
    expect(firstResult.value.document.sourceTemplateVersion).toBe(3);
    expect(compilePreview.execute).toHaveBeenCalledTimes(1);

    const secondResult = await useCase.execute({
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      templateId: "template-1",
      templateVersion: 4,
      userId: "user-1",
      compilePreview,
    });

    expect(secondResult.ok).toBe(true);
    if (!secondResult.ok) {
      throw secondResult.error;
    }

    expect(secondResult.value.compiled).toBe(false);
    expect(secondResult.value.document.sourceTemplateVersion).toBe(3);
    expect(compilePreview.execute).toHaveBeenCalledTimes(1);
  });

  it("saveEdited updates only edited blocks and keeps the compiled snapshot intact", async () => {
    resetFactories();

    const repository = new InMemoryRecordDocumentRepository([
      makeRecordDocument({
        id: "doc-1",
        templateId: "template-1",
        recordId: "record-1",
        compiledBlocks: [{ type: "p", children: [{ text: "Compilado base" }] }],
        editedBlocks: [{ type: "p", children: [{ text: "Editado previo" }] }],
        version: 2,
      }),
    ]);
    const useCase = new SaveRecordDocumentEditsUseCase(repository);

    const result = await useCase.execute({
      templateId: "template-1",
      recordId: "record-1",
      editedBlocks: [{ type: "p", children: [{ text: "Editado actual" }] }],
      expectedVersion: 2,
      userId: "user-2",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }

    expect(result.value.compiledBlocks).toEqual([
      { type: "p", children: [{ text: "Compilado base" }] },
    ]);
    expect(result.value.editedBlocks).toEqual([
      { type: "p", children: [{ text: "Editado actual" }] },
    ]);
    expect(result.value.version).toBe(3);
  });

  it("regenerate recompiles and overwrites both compiled and edited blocks", async () => {
    resetFactories();

    const repository = new InMemoryRecordDocumentRepository([
      makeRecordDocument({
        id: "doc-1",
        accountId: "workspace-1",
        collectionId: "collection-1",
        recordId: "record-1",
        templateId: "template-1",
        compiledBlocks: [{ type: "p", children: [{ text: "Viejo compilado" }] }],
        editedBlocks: [{ type: "p", children: [{ text: "Viejo editado" }] }],
        sourceTemplateVersion: 1,
        version: 2,
      }),
    ]);
    const compilePreview = {
      execute: vi.fn(async () =>
        ok({
          requestId: "req-2",
          warnings: ["Updated from template"],
          blocks: [{ type: "p", children: [{ text: "Nuevo compilado" }] }],
        }),
      ),
    };

    const useCase = new RegenerateRecordDocumentUseCase(repository);
    const result = await useCase.execute({
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      templateId: "template-1",
      templateVersion: 5,
      userId: "user-1",
      compilePreview,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw result.error;
    }

    expect(result.value.document.compiledBlocks).toEqual([
      { type: "p", children: [{ text: "Nuevo compilado" }] },
    ]);
    expect(result.value.document.editedBlocks).toEqual([
      { type: "p", children: [{ text: "Nuevo compilado" }] },
    ]);
    expect(result.value.document.sourceTemplateVersion).toBe(5);
    expect(result.value.document.version).toBe(3);
  });

  it("renderPdf always renders from edited blocks", async () => {
    resetFactories();

    const repository = new InMemoryRecordDocumentRepository([
      makeRecordDocument({
        id: "doc-1",
        templateId: "template-1",
        recordId: "record-1",
        compiledBlocks: [{ type: "p", children: [{ text: "Compilado" }] }],
        editedBlocks: [{ type: "p", children: [{ text: "Editado final" }] }],
      }),
    ]);
    const render = vi.fn(async () => Buffer.from("pdf"));
    const useCase = new RenderRecordDocumentPdfUseCase(repository, { render });

    const result = await useCase.execute({
      templateId: "template-1",
      recordId: "record-1",
      title: "Documento final",
    });

    expect(result.ok).toBe(true);
    expect(render).toHaveBeenCalledWith(
      [{ type: "p", children: [{ text: "Editado final" }] }],
      "Documento final",
      undefined,
    );
  });

  it("surfaces version conflicts when saving stale edits", async () => {
    resetFactories();

    const repository = new InMemoryRecordDocumentRepository([
      makeRecordDocument({
        id: "doc-1",
        templateId: "template-1",
        recordId: "record-1",
        version: 4,
      }),
    ]);
    const useCase = new SaveRecordDocumentEditsUseCase(repository);

    const result = await useCase.execute({
      templateId: "template-1",
      recordId: "record-1",
      editedBlocks: [{ type: "p", children: [{ text: "Stale edit" }] }],
      expectedVersion: 3,
      userId: "user-2",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DOCUMENT_VERSION_CONFLICT");
    }
  });

  it("propagates compile failures during regeneration", async () => {
    resetFactories();

    const repository = new InMemoryRecordDocumentRepository([
      makeRecordDocument({
        id: "doc-1",
        templateId: "template-1",
        recordId: "record-1",
      }),
    ]);
    const compilePreview = {
      execute: vi.fn(async () => fail(new DomainError("AI failed", "TEMPLATE_COMPILE_ERROR"))),
    };

    const useCase = new RegenerateRecordDocumentUseCase(repository);
    const result = await useCase.execute({
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      templateId: "template-1",
      templateVersion: 2,
      userId: "user-1",
      compilePreview,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("TEMPLATE_COMPILE_ERROR");
    }
  });
});
