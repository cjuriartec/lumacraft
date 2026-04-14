"use client";

import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { LogicBlockEditorDialog } from "@/modules/template/presentation/components/logic-block-editor-dialog";
import { TEMPLATE_LIST_TYPE } from "@/modules/template/presentation/components/template-logic-blocks";
import type { TemplateVariableCatalogNode } from "@/modules/template/presentation/types/template-variable-catalog";

vi.mock("@/modules/template/presentation/components/template-logic-blocks", () => ({
  DEFAULT_TEMPLATE_AI_PROMPT: "Summarize the current record.",
  TEMPLATE_AI_TYPE: "template_ai",
  TEMPLATE_CONDITIONAL_TYPE: "template_conditional",
  TEMPLATE_LIST_TYPE: "template_list",
  TEMPLATE_SWITCH_TYPE: "template_switch",
}));

vi.mock("@/modules/template/presentation/components/dynamic-value-input", () => ({
  DynamicValueInput: () => <div data-testid="dynamic-value-input" />,
}));

vi.mock("@/modules/template/presentation/components/variable-selector", () => ({
  VariableSelector: ({ trigger, disabled }: { trigger?: ReactNode; disabled?: boolean }) => (
    <div data-disabled={disabled ? "true" : "false"}>{trigger ?? null}</div>
  ),
}));

vi.mock("@/shared/presentation/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/presentation/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/shared/presentation/components/ui/input", () => ({
  Input: ({ enableAI: _enableAI, ...props }: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/shared/presentation/components/ui/label", () => ({
  Label: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}));

vi.mock("@/shared/presentation/components/ui/textarea", () => ({
  Textarea: ({ enableAI: _enableAI, ...props }: Record<string, unknown>) => <textarea {...props} />,
}));

vi.mock("@/shared/presentation/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div role="option" data-value={value} aria-selected={false}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? ""}</span>,
}));

describe("LogicBlockEditorDialog list source regression coverage", () => {
  it("includes iterable relation and reverse-lookup nodes in the list source selector", () => {
    const catalogNodes: TemplateVariableCatalogNode[] = [
      {
        path: "lineItems",
        displayName: "Line Items",
        fieldType: "RELATION",
        collectionId: "11111111-1111-4111-8111-111111111111",
        cardinality: "ONE_TO_MANY",
        children: [
          {
            path: "lineItems.name",
            displayName: "Name",
            fieldType: "TEXT",
            collectionId: "22222222-2222-4222-8222-222222222222",
          },
        ],
      },
      {
        path: "billingContact",
        displayName: "Billing Contact",
        fieldType: "RELATION",
        collectionId: "11111111-1111-4111-8111-111111111111",
        cardinality: "MANY_TO_ONE",
        children: [
          {
            path: "billingContact.orders",
            displayName: "Orders (Customer) [Billing Contact]",
            fieldType: "REVERSE_LOOKUP",
            collectionId: "22222222-2222-4222-8222-222222222222",
            cardinality: "ONE_TO_MANY",
          },
          {
            path: "billingContact.managers",
            displayName: "Managers (Manager) [Billing Contact]",
            fieldType: "REVERSE_LOOKUP",
            collectionId: "22222222-2222-4222-8222-222222222222",
            cardinality: "MANY_TO_ONE",
          },
        ],
      },
    ];

    render(
      <LogicBlockEditorDialog
        open
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
        catalogNodes={catalogNodes}
        element={{
          type: TEMPLATE_LIST_TYPE,
          children: [{ text: "" }],
          sourcePath: "",
          itemAlias: "item",
          itemTemplate: "",
          listStyle: "none",
          emptyText: "",
        }}
      />,
    );

    expect(screen.getByRole("option", { name: "Line Items" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Orders (Customer) [Billing Contact]" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Managers (Manager) [Billing Contact]" }),
    ).not.toBeInTheDocument();
  });
});
