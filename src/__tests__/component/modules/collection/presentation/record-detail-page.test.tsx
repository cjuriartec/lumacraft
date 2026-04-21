import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecordDetailPage } from "@/modules/collection/presentation/pages/record-detail-page";

const breadcrumbsState = vi.hoisted(() => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: breadcrumbsState.useBreadcrumbs,
}));

vi.mock("@/shared/presentation/providers/supabase-provider", () => ({
  useSupabase: () => ({
    supabase: {},
  }),
}));

vi.mock("@/modules/workspace/presentation/providers/workspace-provider", () => ({
  useWorkspace: () => ({
    currentWorkspace: { id: "workspace-1" },
  }),
}));

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
  }),
}));

vi.mock("@/modules/collection/application/collection-use-case.factory", () => ({
  CollectionUseCaseFactory: {
    create: () => ({
      updateRecord: () => ({
        execute: vi.fn(),
      }),
    }),
  },
}));

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => ({
    collections: [
      {
        id: "collection-1",
        name: "projects",
        displayName: "Projects",
        primaryFieldName: "title",
      },
    ],
  }),
}));

vi.mock("@/modules/collection/presentation/hooks/use-fields", () => ({
  useFields: () => ({
    fields: [
      {
        id: "field-1",
        name: "title",
        displayName: "Title",
        fieldType: { value: "TEXT" },
      },
      {
        id: "field-2",
        name: "status",
        displayName: "Estado",
        fieldType: { value: "ENUM" },
      },
    ],
    loading: false,
  }),
}));

vi.mock("@/modules/collection/presentation/hooks/use-eager-record", () => ({
  useEagerRecord: () => ({
    record: {
      id: "record-1",
      collectionId: "collection-1",
      collectionName: "Projects",
      data: {
        title: "Proyecto Atlas",
        status: "Activo",
      },
      relations: {},
    },
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/modules/collection/presentation/hooks/use-collection-workspace-guard", () => ({
  useCollectionWorkspaceGuard: () => false,
}));

vi.mock("@/modules/collection/presentation/components/record-quick-view-dialog", () => ({
  RecordQuickViewDialog: () => null,
}));

vi.mock("@/modules/document/presentation/components/record-document-selector-modal", () => ({
  RecordDocumentSelectorModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>record-document-selector</div> : null,
}));

vi.mock("@/modules/collection/presentation/components/record-editor-form", () => ({
  RecordEditorForm: ({ onCancel }: { onCancel?: () => void }) => (
    <div>
      <p>inline-editor</p>
      <button type="button" onClick={onCancel}>
        cancel-inline-editor
      </button>
    </div>
  ),
}));

vi.mock("@/modules/collection/presentation/hooks/use-storage", () => ({
  useStorage: () => ({
    getPublicUrl: vi.fn().mockReturnValue({ ok: true, value: "https://example.com" }),
    uploadFile: vi.fn(),
    deleteFiles: vi.fn(),
  }),
}));

describe("RecordDetailPage", () => {
  it("renders the record label, short id and breadcrumb with the resolved label", () => {
    render(
      <RecordDetailPage
        collectionId="collection-1"
        recordId="record-1"
        collectionName="Projects"
      />,
    );

    expect(screen.getByRole("heading", { name: "Proyecto Atlas" })).toBeInTheDocument();
    expect(screen.getByText("record-1")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getAllByText("Proyecto Atlas")).not.toHaveLength(0);

    expect(breadcrumbsState.useBreadcrumbs).toHaveBeenCalledWith([
      { label: "Colecciones", href: "/collections" },
      { label: "Projects", href: "/collections/collection-1" },
      { label: "Proyecto Atlas" },
    ]);
  });

  it("toggles into inline edit mode from the detail view", () => {
    render(
      <RecordDetailPage
        collectionId="collection-1"
        recordId="record-1"
        collectionName="Projects"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Editar en línea" }));

    expect(screen.getByText("inline-editor")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "cancel-inline-editor" }));

    expect(screen.queryByText("inline-editor")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar en línea" })).toBeInTheDocument();
  });

  it("opens the related documents selector from the detail actions", () => {
    render(
      <RecordDetailPage
        collectionId="collection-1"
        recordId="record-1"
        collectionName="Projects"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Documentos" }));

    expect(screen.getByText("record-document-selector")).toBeInTheDocument();
  });
});
