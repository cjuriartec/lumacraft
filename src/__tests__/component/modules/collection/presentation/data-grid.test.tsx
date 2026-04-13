import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeField, makeRecord, resetFactories } from "@/__tests__/factories/domain-factories";
import { DataGrid } from "@/modules/collection/presentation/components/data-grid";

const relationState = vi.hoisted(() => ({
  options: {} as Record<string, { id: string; label: string }[]>,
  loading: {} as Record<string, boolean>,
  fetchOptionsByIds: vi.fn(async () => undefined),
}));

vi.mock("@/modules/collection/presentation/hooks/use-relation-records", () => ({
  useRelationRecords: () => ({
    options: relationState.options,
    loading: relationState.loading,
    searchRelations: vi.fn(),
    fetchOptionsByIds: relationState.fetchOptionsByIds,
    fetchBatchOptionsByIds: vi.fn(async () => undefined),
  }),
}));

const storageState = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  downloadFile: vi.fn(async () => ({ ok: true, value: new Blob(["x"]) })),
  getPublicUrl: vi.fn().mockReturnValue({ ok: true, value: "https://example.com" }),
  deleteFiles: vi.fn(),
}));

vi.mock("@/modules/collection/presentation/hooks/use-storage", () => ({
  useStorage: () => storageState,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/modules/document/presentation/components/record-document-selector-modal", () => ({
  RecordDocumentSelectorModal: ({
    isOpen,
    recordId,
  }: {
    isOpen: boolean;
    recordId: string | null;
  }) => (isOpen ? <div data-testid="record-document-selector">{recordId}</div> : null),
}));

vi.mock("@/modules/collection/presentation/components/record-quick-view-dialog", () => ({
  RecordQuickViewDialog: ({
    open,
    target,
  }: {
    open: boolean;
    target: { id: string; label: string } | null;
  }) =>
    open ? <div data-testid="record-quick-view">{`${target?.id}:${target?.label}`}</div> : null,
}));

describe("DataGrid", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    relationState.options = {};
    relationState.loading = {};
    relationState.fetchOptionsByIds.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("propagates search and filters changes correctly", async () => {
    resetFactories();
    const field = makeField({ name: "title", displayName: "Title" });
    const record = makeRecord({
      collectionId: field.collectionId,
      data: { title: "Alpha" },
    });
    const onSearchChange = vi.fn();
    const onFiltersChange = vi.fn();

    render(
      <DataGrid
        fields={[field]}
        records={[record]}
        total={1}
        currentPage={1}
        pageSize={25}
        search=""
        onSearchChange={onSearchChange}
        onFiltersChange={onFiltersChange}
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onInlineEdit={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    // Test Search (Prop change)
    const searchInput = screen.getByPlaceholderText("Buscar registros...");

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "alpha" } });
    });
    expect(onSearchChange).toHaveBeenCalledWith("alpha");

    // Test Filters (Debounced)
    fireEvent.click(screen.getByRole("button", { name: /Filtros/i }));
    fireEvent.click(screen.getByText(/Añadir/i));

    const filterInput = screen.getByPlaceholderText("Filtrar Title...");

    await act(async () => {
      fireEvent.change(filterInput, { target: { value: "alp" } });
    });

    // Advance timers for debounce (600ms)
    await act(async () => {
      vi.advanceTimersByTime(610);
    });

    expect(onFiltersChange).toHaveBeenCalled();
  });

  it("supports inline editing for basic fields", async () => {
    resetFactories();
    // Use explicit TEXT field type
    const field = makeField({ name: "title", displayName: "Title", fieldType: "TEXT" });
    const record = makeRecord({
      id: "record-1",
      collectionId: field.collectionId,
      data: { title: "Alpha" },
    });
    const onInlineEdit = vi.fn(() => Promise.resolve());

    render(
      <DataGrid
        fields={[field]}
        records={[record]}
        total={1}
        currentPage={1}
        pageSize={25}
        search=""
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onInlineEdit={onInlineEdit}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const cell = screen.getByText("Alpha");

    await act(async () => {
      fireEvent.doubleClick(cell);
    });

    const input = screen.getByDisplayValue("Alpha");

    await act(async () => {
      fireEvent.change(input, { target: { value: "Beta" } });
      fireEvent.blur(input);
    });

    // Wait for the async call
    expect(onInlineEdit).toHaveBeenCalled();
  });

  it("renders the eye action as a link to the record detail page", async () => {
    resetFactories();
    const field = makeField({ name: "title", displayName: "Title", fieldType: "TEXT" });
    const record = makeRecord({
      id: "record-1",
      collectionId: field.collectionId,
      data: { title: "Alpha" },
    });

    render(
      <DataGrid
        collectionId={field.collectionId}
        fields={[field]}
        records={[record]}
        total={1}
        currentPage={1}
        pageSize={25}
        search=""
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onInlineEdit={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canRead
      />,
    );

    const viewLink = screen.getByRole("link", { name: /Ver registro record-1/i });
    expect(viewLink).toHaveAttribute("href", `/collections/${field.collectionId}/records/record-1`);
  });

  it("keeps the document action opening the document selector", async () => {
    resetFactories();
    const field = makeField({ name: "title", displayName: "Title", fieldType: "TEXT" });
    const record = makeRecord({
      id: "record-1",
      collectionId: field.collectionId,
      data: { title: "Alpha" },
    });

    render(
      <DataGrid
        collectionId={field.collectionId}
        fields={[field]}
        records={[record]}
        total={1}
        currentPage={1}
        pageSize={25}
        search=""
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onInlineEdit={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        canRead
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Abrir documento del registro record-1/i }));

    expect(screen.getByTestId("record-document-selector")).toHaveTextContent("record-1");
  });

  it("opens the quick view when clicking a related record name inside the relation popover", async () => {
    resetFactories();
    const field = makeField({
      id: "field-1",
      collectionId: "collection-1",
      name: "client_id",
      displayName: "Cliente",
      fieldType: "RELATION",
      config: {
        targetCollectionId: "11111111-1111-4111-8111-111111111111",
        relationType: "MANY_TO_ONE",
        displayField: "name",
      },
    });
    const record = makeRecord({
      id: "record-2",
      collectionId: field.collectionId,
      data: { client_id: "client-1" },
    });

    relationState.options = {
      client_id: [{ id: "client-1", label: "ACME Corp" }],
    };

    render(
      <DataGrid
        collectionId={field.collectionId}
        fields={[field]}
        records={[record]}
        total={1}
        currentPage={1}
        pageSize={25}
        search=""
        onSearchChange={vi.fn()}
        onFiltersChange={vi.fn()}
        onPageChange={vi.fn()}
        onSort={vi.fn()}
        onInlineEdit={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText(/1 Relación/i));
    fireEvent.click(screen.getByRole("button", { name: "ACME Corp" }));

    expect(screen.getByTestId("record-quick-view")).toHaveTextContent("client-1:ACME Corp");
  });
});
