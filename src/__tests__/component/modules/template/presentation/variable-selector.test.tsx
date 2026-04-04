import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { VariableSelector } from "@/modules/template/presentation/components/variable-selector";
import type { VariableNode } from "@/modules/template/presentation/hooks/use-variable-fields";

const variableFieldsState = vi.hoisted(() => ({
  loading: false,
  nodes: [] as VariableNode[],
}));

vi.mock("@/modules/template/presentation/hooks/use-variable-fields", () => ({
  useVariableFields: () => variableFieldsState,
}));

describe("VariableSelector keyboard navigation", () => {
  beforeEach(() => {
    variableFieldsState.loading = false;
    variableFieldsState.nodes = [
      {
        path: "cliente.nombre",
        displayName: "Nombre",
        fieldType: "TEXT",
        collectionId: "collection-1",
      },
      {
        path: "cliente.email",
        displayName: "Email",
        fieldType: "TEXT",
        collectionId: "collection-1",
      },
    ];
  });

  it("navigates with arrows and selects with enter", () => {
    const onSelect = vi.fn();

    render(
      <VariableSelector
        collectionId="collection-1"
        open
        onOpenChange={vi.fn()}
        onSelect={onSelect}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Buscar campos...");
    const nameButton = screen.getByText("Nombre").closest("button");
    const emailButton = screen.getByText("Email").closest("button");

    expect(nameButton).not.toBeNull();
    expect(emailButton).not.toBeNull();

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    expect(nameButton).toHaveFocus();

    fireEvent.keyDown(nameButton as HTMLButtonElement, { key: "ArrowDown" });
    expect(emailButton).toHaveFocus();

    fireEvent.keyDown(emailButton as HTMLButtonElement, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "cliente.email",
      }),
    );
  });
});
