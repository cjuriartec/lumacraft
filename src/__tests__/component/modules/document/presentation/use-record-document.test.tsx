import { act, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRecordDocument } from "@/modules/document/presentation/hooks/use-record-document";
import { RecordDocumentPreviewPayload } from "@/modules/document/presentation/types/record-document";
import { TemplateBlocks } from "@/modules/template/domain/types/template-blocks";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function makeBlocks(text: string): TemplateBlocks {
  return [{ type: "p", children: [{ text }] }];
}

function buildPayload(version: number, editedBlocks: TemplateBlocks): RecordDocumentPreviewPayload {
  return {
    document: {
      id: "document-1",
      accountId: "account-1",
      collectionId: "collection-1",
      recordId: "record-1",
      templateId: "template-1",
      compiledBlocks: makeBlocks("Compilado"),
      editedBlocks,
      sourceTemplateVersion: 1,
      version,
      compiledAt: "2024-01-01T00:00:00.000Z",
      lastEditedAt: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    template: {
      id: "template-1",
      name: "Documento",
      collectionId: "collection-1",
      version: 1,
    },
    record: {
      id: "record-1",
      label: "Registro",
    },
    permissions: {
      canRead: true,
      canUpdate: true,
    },
    warnings: [],
  };
}

function makeJsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(),
    redirected: false,
    statusText: status === 200 ? "OK" : "Error",
    type: "basic",
    url: "",
  } as unknown as Response;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

function HookHarness() {
  const document = useRecordDocument({
    collectionId: "collection-1",
    recordId: "record-1",
    templateId: "template-1",
  });

  return (
    <div>
      <div data-testid="version">{document.payload?.document.version ?? "loading"}</div>
      <div data-testid="save-status">{document.saveStatus}</div>
      <button type="button" onClick={() => document.handleBlocksChange(makeBlocks("Primero"))}>
        Editar 1
      </button>
      <button type="button" onClick={() => document.handleBlocksChange(makeBlocks("Segundo"))}>
        Editar 2
      </button>
    </div>
  );
}

describe("useRecordDocument", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("queues a second save until the previous versioned request finishes", async () => {
    const firstSave = createDeferred<ReturnType<typeof makeJsonResponse>>();
    const secondSave = createDeferred<ReturnType<typeof makeJsonResponse>>();
    const patchBodies: Array<{ editedBlocks: TemplateBlocks; version: number }> = [];

    fetchMock.mockImplementation((_input, init) => {
      if (!init?.method || init.method === "GET") {
        return Promise.resolve(makeJsonResponse({ data: buildPayload(1, makeBlocks("Inicial")) }));
      }

      if (init.method === "PATCH") {
        patchBodies.push(JSON.parse(String(init.body)));

        if (patchBodies.length === 1) {
          return firstSave.promise;
        }

        if (patchBodies.length === 2) {
          return secondSave.promise;
        }
      }

      throw new Error(`Unexpected request: ${String(init?.method ?? "GET")}`);
    });

    render(<HookHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await flushPromises();
    });

    expect(screen.getByTestId("version")).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: /Editar 1/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
      await flushPromises();
    });

    expect(patchBodies).toEqual([
      {
        editedBlocks: makeBlocks("Primero"),
        version: 1,
      },
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Editar 2/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
      await flushPromises();
    });

    expect(patchBodies).toHaveLength(1);

    await act(async () => {
      firstSave.resolve(makeJsonResponse({ data: buildPayload(2, makeBlocks("Primero")) }));
      await flushPromises();
    });

    expect(patchBodies).toEqual([
      {
        editedBlocks: makeBlocks("Primero"),
        version: 1,
      },
      {
        editedBlocks: makeBlocks("Segundo"),
        version: 2,
      },
    ]);

    await act(async () => {
      secondSave.resolve(makeJsonResponse({ data: buildPayload(3, makeBlocks("Segundo")) }));
      await flushPromises();
    });

    expect(screen.getByTestId("version")).toHaveTextContent("3");
    expect(screen.getByTestId("save-status")).toHaveTextContent("saved");
  });

  it("uses the latest persisted version for sequential saves", async () => {
    const patchBodies: Array<{ editedBlocks: TemplateBlocks; version: number }> = [];

    fetchMock.mockImplementation((_input, init) => {
      if (!init?.method || init.method === "GET") {
        return Promise.resolve(makeJsonResponse({ data: buildPayload(10, makeBlocks("Inicial")) }));
      }

      if (init.method === "PATCH") {
        const body = JSON.parse(String(init.body)) as {
          editedBlocks: TemplateBlocks;
          version: number;
        };

        patchBodies.push(body);

        return Promise.resolve(
          makeJsonResponse({
            data: buildPayload(body.version + 1, body.editedBlocks),
          }),
        );
      }

      throw new Error(`Unexpected request: ${String(init?.method ?? "GET")}`);
    });

    render(<HookHarness />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
      await flushPromises();
    });

    fireEvent.click(screen.getByRole("button", { name: /Editar 1/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
      await flushPromises();
    });

    fireEvent.click(screen.getByRole("button", { name: /Editar 2/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
      await flushPromises();
    });

    expect(patchBodies).toEqual([
      {
        editedBlocks: makeBlocks("Primero"),
        version: 10,
      },
      {
        editedBlocks: makeBlocks("Segundo"),
        version: 11,
      },
    ]);
    expect(screen.getByTestId("version")).toHaveTextContent("12");
  });
});
