import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeCollection,
  makeField,
  makeRecord,
  resetFactories,
} from "@/__tests__/factories/domain-factories";
import WorkspaceRecordsPage from "@/modules/collection/presentation/pages/workspace-records-page";

const schemaState = vi.hoisted(() => ({
  collections: [] as ReturnType<typeof makeCollection>[],
  fields: [] as ReturnType<typeof makeField>[],
  loading: false,
}));

const permissionsState = vi.hoisted(() => ({
  can: (_collectionId: string, _action: "read" | "create" | "update" | "delete") => true,
  isOwner: true,
  isSuperAdmin: false,
  loading: false,
}));

const recordsState = vi.hoisted(() => ({
  records: [] as ReturnType<typeof makeRecord>[],
  total: 0,
  loading: false,
  pagination: {
    page: 1,
    pageSize: 20,
    sortField: "updated_at",
    sortDirection: "desc" as const,
    search: "",
  },
  selectedCollectionId: "all",
  setSearch: vi.fn(),
  setPage: vi.fn(),
  setSelectedCollectionId: vi.fn(),
}));

vi.mock("@/modules/collection/presentation/hooks/use-workspace-schema", () => ({
  useWorkspaceSchema: () => schemaState,
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => permissionsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-workspace-records", () => ({
  useWorkspaceRecords: () => recordsState,
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/presentation/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange: (value: string) => void;
  }) => (
    <div
      data-testid="records-select"
      data-value={value}
      onClick={() => onValueChange("collection-1")}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children, placeholder }: { children?: ReactNode; placeholder?: string }) => (
    <span>{children || placeholder}</span>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

describe("WorkspaceRecordsPage", () => {
  beforeEach(() => {
    resetFactories();
    schemaState.loading = false;
    permissionsState.can = () => true;
    permissionsState.isOwner = true;
    permissionsState.isSuperAdmin = false;
    permissionsState.loading = false;
    recordsState.records = [];
    recordsState.total = 0;
    recordsState.loading = false;
    recordsState.pagination = {
      page: 1,
      pageSize: 20,
      sortField: "updated_at",
      sortDirection: "desc",
      search: "",
    };
    recordsState.selectedCollectionId = "all";
    recordsState.setSearch.mockReset();
    recordsState.setPage.mockReset();
    recordsState.setSelectedCollectionId.mockReset();

    schemaState.collections = [
      makeCollection({
        id: "collection-1",
        name: "projects",
        displayName: "Projects",
        primaryFieldName: "nombre",
      }),
    ];
    schemaState.fields = [
      makeField({
        id: "field-1",
        collectionId: "collection-1",
        name: "nombre",
        displayName: "Nombre",
      }),
    ];
  });

  it("renders a flat workspace records table with collection and actions", () => {
    recordsState.records = [
      makeRecord({
        id: "record-1",
        collectionId: "collection-1",
        data: { nombre: "Proyecto Atlas" },
      }),
    ];
    recordsState.total = 1;

    render(<WorkspaceRecordsPage />);

    expect(screen.getByText("Proyecto Atlas")).toBeInTheDocument();
    expect(screen.getAllByText("Projects").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Abrir" })).toHaveAttribute(
      "href",
      "/collections/collection-1/records/record-1",
    );
    expect(screen.getByRole("link", { name: /Colección/i })).toHaveAttribute(
      "href",
      "/collections/collection-1",
    );
  });

  it("delegates search and pagination interactions to the workspace records hook", () => {
    recordsState.total = 40;
    recordsState.pagination.page = 2;

    render(<WorkspaceRecordsPage />);

    fireEvent.change(screen.getByPlaceholderText("Buscar registros..."), {
      target: { value: "Atlas" },
    });
    fireEvent.click(screen.getByText("Anterior"));

    expect(recordsState.setSearch).toHaveBeenCalledWith("Atlas");
    expect(recordsState.setPage).toHaveBeenCalledWith(1);
  });
});
