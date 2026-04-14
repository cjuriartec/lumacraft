import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { makeField, resetFactories } from "@/__tests__/factories/domain-factories";
import { FieldFormDialog } from "@/modules/collection/presentation/components/field-form-dialog";

vi.mock("@/modules/collection/presentation/hooks/use-mime-types", () => ({
  useMimeTypes: () => ({
    mimeTypes: [],
    loading: false,
  }),
}));

vi.mock("@/shared/presentation/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/presentation/components/ui/input", () => ({
  Input: ({ enableAI: _enableAI, ...props }: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/shared/presentation/components/ui/textarea", () => ({
  Textarea: ({ enableAI: _enableAI, ...props }: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock("@/shared/presentation/components/ui/label", () => ({
  Label: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@/shared/presentation/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock("@/shared/presentation/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/presentation/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/presentation/components/ui/tag-input", () => ({
  TagInput: () => <div>tag-input</div>,
}));

vi.mock("@/shared/presentation/components/ui/select", () => {
  const SELECT_ITEM_SYMBOL = Symbol("SelectItem");

  function collectSelectItems(children: ReactNode): ReactElement[] {
    const items: ReactElement[] = [];

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) {
        return;
      }

      if ((child.type as { __kind?: symbol }).__kind === SELECT_ITEM_SYMBOL) {
        items.push(child);
        return;
      }

      if ((child.props as { children?: ReactNode } | undefined)?.children) {
        items.push(...collectSelectItems((child.props as { children?: ReactNode }).children));
      }
    });

    return items;
  }

  const SelectItem = ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  );
  (SelectItem as { __kind?: symbol }).__kind = SELECT_ITEM_SYMBOL;

  return {
    Select: ({
      children,
      value,
      onValueChange,
      disabled,
    }: {
      children: ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
      disabled?: boolean;
    }) => {
      const items = collectSelectItems(children);

      return (
        <select
          data-testid="mock-select"
          value={value}
          disabled={disabled}
          onChange={(event) => onValueChange?.(event.target.value)}
        >
          <option value="">--</option>
          {items}
        </select>
      );
    },
    SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectItem,
    SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
    SelectValue: () => null,
  };
});

describe("FieldFormDialog", () => {
  it("removes the bidirectional toggle and normalizes relation submits as bidirectional", async () => {
    resetFactories();
    const onSubmit = vi.fn(async () => ({ ok: true, value: makeField() }) as const);

    render(
      <FieldFormDialog
        onSubmit={onSubmit}
        availableCollections={[{ id: "11111111-1111-4111-8111-111111111111", name: "orders" }]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre visible"), {
      target: { value: "Cliente" },
    });

    const selects = screen.getAllByTestId("mock-select");
    fireEvent.change(selects[0], { target: { value: "RELATION" } });

    await waitFor(() => {
      expect(screen.getByText("Nombre campo inverso")).toBeInTheDocument();
    });

    const relationSelects = screen.getAllByTestId("mock-select");
    fireEvent.change(relationSelects[1], {
      target: { value: "11111111-1111-4111-8111-111111111111" },
    });
    fireEvent.change(relationSelects[2], { target: { value: "MANY_TO_ONE" } });

    fireEvent.change(screen.getByPlaceholderText("ej: ordenes_relacionadas"), {
      target: { value: "orders_inverse" },
    });

    expect(screen.queryByText("Bidireccional")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Crear Campo" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          fieldType: "RELATION",
          config: expect.objectContaining({
            bidirectional: true,
            inverseFieldName: "orders_inverse",
          }),
        }),
      );
    });
  });

  it("shows the inverse field name as read-only reference while editing a relation field", () => {
    resetFactories();
    const relationField = makeField({
      id: "field-1",
      collectionId: "collection-1",
      name: "client_id",
      displayName: "Cliente",
      fieldType: "RELATION",
      config: {
        targetCollectionId: "11111111-1111-4111-8111-111111111111",
        relationType: "MANY_TO_ONE",
        displayField: "name",
        bidirectional: true,
        inverseFieldName: "orders_inverse",
      },
    });

    render(
      <FieldFormDialog
        field={relationField}
        onSubmit={vi.fn(async () => ({ ok: true, value: relationField }) as const)}
        availableCollections={[{ id: "11111111-1111-4111-8111-111111111111", name: "orders" }]}
      />,
    );

    const inverseInput = screen.getByDisplayValue("orders_inverse");
    expect(inverseInput).toBeDisabled();
    expect(screen.queryByText("Bidireccional")).not.toBeInTheDocument();
  });
});
