import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { makeField, resetFactories } from "@/__tests__/factories/domain-factories";
import { FieldManager } from "@/modules/collection/presentation/components/field-manager";

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => ({
    collections: [{ id: "collection-2", name: "clients", displayName: "Clients" }],
  }),
}));

vi.mock("@/modules/guidance/presentation/hooks/use-guidance", () => ({
  useGuidance: () => ({
    trackMilestone: vi.fn(),
  }),
}));

vi.mock("@/modules/collection/presentation/components/field-form-dialog", () => ({
  FieldFormDialog: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("framer-motion", () => ({
  Reorder: {
    Group: ({
      as,
      values,
      onReorder,
      children,
      ...props
    }: {
      as?: React.ElementType;
      values: Array<{ id: string }>;
      onReorder: (values: Array<{ id: string }>) => void;
      children: ReactNode;
      [key: string]: unknown;
    }) => {
      const Tag = (as || "div") as React.ElementType;
      return React.createElement(
        Tag,
        props,
        <>
          <button type="button" onClick={() => onReorder([...values].reverse())}>
            mock-reorder
          </button>
          {children}
        </>,
      );
    },
    Item: ({
      as,
      onDragEnd,
      children,
      ...props
    }: {
      as?: React.ElementType;
      onDragEnd?: () => void;
      children: ReactNode;
      [key: string]: unknown;
    }) => {
      const Tag = (as || "div") as React.ElementType;
      return React.createElement(
        Tag,
        props,
        <>
          {children}
          <button type="button" onClick={onDragEnd}>
            mock-drag-end
          </button>
        </>,
      );
    },
  },
}));

describe("FieldManager", () => {
  it("persists reordered field ids when drag ends after a reorder", async () => {
    resetFactories();
    const firstField = makeField({
      id: "field-1",
      collectionId: "collection-1",
      name: "title",
      displayName: "Title",
      sortOrder: 0,
    });
    const secondField = makeField({
      id: "field-2",
      collectionId: "collection-1",
      name: "status",
      displayName: "Status",
      sortOrder: 1,
    });
    const reorderFields = vi.fn(async () => ({ ok: true, value: undefined }) as const);

    render(
      <FieldManager
        collectionId="collection-1"
        fields={[firstField, secondField]}
        createField={vi.fn(async () => ({ ok: true, value: firstField }) as const)}
        updateField={vi.fn(async () => ({ ok: true, value: firstField }) as const)}
        deleteField={vi.fn(async () => ({ ok: true, value: undefined }) as const)}
        reorderFields={reorderFields}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByText("mock-reorder"));
    });

    await act(async () => {
      fireEvent.click(screen.getAllByText("mock-drag-end")[0]);
    });

    expect(reorderFields).toHaveBeenCalledWith(["field-2", "field-1"]);
  });
});
