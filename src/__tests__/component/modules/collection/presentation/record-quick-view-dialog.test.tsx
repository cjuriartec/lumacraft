import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeField, resetFactories } from "@/__tests__/factories/domain-factories";
import { RecordQuickViewDialog } from "@/modules/collection/presentation/components/record-quick-view-dialog";
import type { EagerLoadedRecord } from "@/modules/collection/domain/types/eager-loading.types";
import type { RelatedRecordSummary } from "@/modules/collection/presentation/lib/record-relations";

const collectionsState = vi.hoisted(() => ({
  collections: [] as Array<{
    id: string;
    primaryFieldName?: string | null;
    displayName?: string;
    name?: string;
  }>,
}));

const eagerRecordState = vi.hoisted(() => ({
  record: null as EagerLoadedRecord | null,
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));

const fieldsState = vi.hoisted(() => ({
  fields: [] as ReturnType<typeof makeField>[],
  loading: false,
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

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => collectionsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-eager-record", () => ({
  useEagerRecord: () => eagerRecordState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-fields", () => ({
  useFields: () => fieldsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-storage", () => ({
  useStorage: () => ({
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    getPublicUrl: vi.fn(),
    deleteFiles: vi.fn(),
  }),
}));

describe("RecordQuickViewDialog", () => {
  beforeEach(() => {
    resetFactories();
    vi.clearAllMocks();

    collectionsState.collections = [
      {
        id: "collection-1",
        primaryFieldName: "title",
        displayName: "Projects",
      },
    ];

    fieldsState.fields = Array.from({ length: 6 }, (_, index) =>
      makeField({
        id: `field-${index + 1}`,
        collectionId: "collection-1",
        name: `field_${index + 1}`,
        displayName: `Field ${index + 1}`,
        fieldType: "TEXT",
      }),
    );

    eagerRecordState.record = {
      id: "record-1",
      collectionId: "collection-1",
      collectionName: "Projects",
      data: {
        title: "Record title",
        field_1: "Value 1",
        field_2: "Value 2",
        field_3: "Value 3",
        field_4: "Value 4",
        field_5: "Value 5",
        field_6: "Value 6",
      },
      relations: {},
    };
    eagerRecordState.loading = false;
    eagerRecordState.error = null;
  });

  it("keeps the quick view within the viewport and scrolls the body", () => {
    const target: RelatedRecordSummary = {
      id: "record-1",
      label: "Record title",
      collectionId: "collection-1",
      collectionName: "Projects",
    };

    render(<RecordQuickViewDialog open={true} onOpenChange={vi.fn()} target={target} />);

    const dialog = screen.getByRole("dialog");
    const scrollArea = screen.getByTestId("record-quick-view-scroll-area");

    expect(dialog.className).toContain("max-h-[85vh]");
    expect(dialog.className).toContain("flex-col");
    expect(scrollArea.className).toContain("min-h-0");
    expect(scrollArea.className).toContain("overflow-y-auto");
    expect(screen.getByText("Field 1")).toBeInTheDocument();
    expect(screen.queryByText("Field 6")).not.toBeInTheDocument();
  });
});
