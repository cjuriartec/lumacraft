import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeField, makeRecord, resetFactories } from "@/__tests__/factories/domain-factories";
import { Field } from "@/modules/collection/domain/entities/field.entity";
import { DataRecord } from "@/modules/collection/domain/entities/record.entity";
import { CollectionDetailPage } from "@/modules/collection/presentation/pages/collection-detail-page";

const fieldsState = vi.hoisted(() => ({
  fields: [] as Field[],
  loading: false,
  createField: vi.fn(),
  updateField: vi.fn(),
  deleteField: vi.fn(),
}));

const recordsState = vi.hoisted(() => ({
  records: [] as DataRecord[],
  total: 0,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 25,
    sortField: "created_at",
    sortDirection: "desc" as const,
    search: "",
    searchFields: [],
    filters: [],
  },
  createRecord: vi.fn(),
  updateRecord: vi.fn(),
  deleteRecord: vi.fn(),
  setPage: vi.fn(),
  setSort: vi.fn(),
  setSearch: vi.fn(),
  setSearchFields: vi.fn(),
  setFilters: vi.fn(),
  setPagination: vi.fn(),
}));

const collectionsState = vi.hoisted(() => ({
  collections: [] as unknown[],
  loading: false,
  createCollection: vi.fn(),
  updateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  refresh: vi.fn(),
}));

const gridPersistenceState = vi.hoisted(() => ({
  loadStoredFilters: vi.fn(async () => null),
  persistFilters: vi.fn(),
}));

const permissionsState = vi.hoisted(() => ({
  can: vi.fn(() => true),
  isOwner: true,
  isSuperAdmin: false,
}));

const navigationState = vi.hoisted(() => ({
  replace: vi.fn(),
  pathname: "/collections/collection-1",
  searchParams: new URLSearchParams(),
}));

vi.mock("@/modules/collection/presentation/hooks/use-fields", () => ({
  useFields: () => fieldsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-records", () => ({
  useRecords: () => recordsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => collectionsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-grid-persistence", () => ({
  useGridPersistence: () => gridPersistenceState,
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => permissionsState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigationState.replace }),
  usePathname: () => navigationState.pathname,
  useSearchParams: () => navigationState.searchParams,
}));

vi.mock("@/modules/collection/presentation/components/field-manager", () => ({
  FieldManager: () => <div data-testid="field-manager">field-manager</div>,
}));

vi.mock("@/modules/collection/presentation/components/data-grid", () => ({
  DataGrid: ({
    records,
    onAddRecord,
    onEdit,
    onDelete,
  }: {
    records: DataRecord[];
    onAddRecord: () => void;
    onEdit: (r: DataRecord) => void;
    onDelete: (id: string) => void;
  }) => (
    <div data-testid="data-grid">
      <span>data-grid</span>
      {onAddRecord ? (
        <button type="button" onClick={onAddRecord}>
          add-record
        </button>
      ) : null}
      {records[0] ? (
        <>
          <button type="button" onClick={() => onEdit(records[0])}>
            edit-record
          </button>
          <button type="button" onClick={() => onDelete(records[0].id)}>
            delete-record
          </button>
        </>
      ) : null}
    </div>
  ),
}));

vi.mock("@/modules/collection/presentation/components/record-form-dialog", () => ({
  RecordFormDialog: ({
    open,
    record,
    onSubmit,
  }: {
    open: boolean;
    record?: DataRecord;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
  }) =>
    open ? (
      <div data-testid="record-form-dialog">
        <span>{record ? `editing:${record.id}` : "editing:new"}</span>
        <button type="button" onClick={() => void onSubmit({ title: "Submitted" })}>
          submit-dialog
        </button>
      </div>
    ) : null,
}));

vi.mock("@/modules/template/presentation/pages/template-list-page", () => ({
  __esModule: true,
  default: () => <div data-testid="template-list-page">template-list-page</div>,
}));

describe("CollectionDetailPage", () => {
  beforeEach(() => {
    resetFactories();
    vi.clearAllMocks();
    fieldsState.fields = [
      makeField({ id: "field-1", collectionId: "collection-1", name: "title", fieldType: "TEXT" }),
    ];
    fieldsState.loading = false;
    recordsState.records = [
      makeRecord({ id: "record-1", collectionId: "collection-1", data: { title: "Alpha" } }),
    ];
    recordsState.total = 1;
    recordsState.loading = false;
    recordsState.createRecord.mockReset().mockResolvedValue({ ok: true });
    recordsState.updateRecord.mockReset().mockResolvedValue({ ok: true });
    recordsState.deleteRecord.mockReset().mockResolvedValue({ ok: true });
    collectionsState.collections = [
      { id: "collection-1", name: "Projects", toJSON: () => ({ id: "collection-1" }) },
    ];
    gridPersistenceState.loadStoredFilters.mockResolvedValue(null);
    navigationState.replace.mockReset();
    navigationState.searchParams = new URLSearchParams();
  });

  it("renders the loading state while fields are syncing", async () => {
    fieldsState.loading = true;

    render(<CollectionDetailPage collectionId="collection-1" collectionName="Projects" />);

    // Page will initially wait for hydration (isHydrated starts false)
    // Then it should show loading fields
    await waitFor(() => {
      expect(screen.getByText("Sincronizando esquema...")).toBeInTheDocument();
    });
  });

  it("creates a record from the dialog opened by the new record button", async () => {
    render(<CollectionDetailPage collectionId="collection-1" collectionName="Projects" />);

    // Wait for hydration
    await waitFor(() => {
      expect(screen.getByTestId("data-grid")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("add-record"));

    await waitFor(() => {
      expect(screen.getByText("editing:new")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("submit-dialog"));

    await waitFor(() => {
      expect(recordsState.createRecord).toHaveBeenCalledWith({ title: "Submitted" });
    });
  });

  it("edits and deletes records via the data grid callbacks", async () => {
    render(<CollectionDetailPage collectionId="collection-1" collectionName="Projects" />);

    await waitFor(() => {
      expect(screen.getByTestId("data-grid")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("edit-record"));

    await waitFor(() => {
      expect(screen.getByText("editing:record-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("submit-dialog"));

    await waitFor(() => {
      expect(recordsState.updateRecord).toHaveBeenCalledWith("record-1", { title: "Submitted" });
    });

    fireEvent.click(screen.getByText("delete-record"));
    await waitFor(() => {
      expect(recordsState.deleteRecord).toHaveBeenCalledWith("record-1");
    });
  });
});
