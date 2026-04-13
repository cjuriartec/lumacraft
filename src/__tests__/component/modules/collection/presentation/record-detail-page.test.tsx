import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RecordDetailPage } from "@/modules/collection/presentation/pages/record-detail-page";

const breadcrumbsState = vi.hoisted(() => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: breadcrumbsState.useBreadcrumbs,
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

vi.mock("@/modules/collection/presentation/components/record-quick-view-dialog", () => ({
  RecordQuickViewDialog: () => null,
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
});
