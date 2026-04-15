import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeTemplate, resetFactories } from "@/__tests__/factories/domain-factories";
import { RecordDocumentSelectorModal } from "@/modules/document/presentation/components/record-document-selector-modal";

const templatesState = vi.hoisted(() => ({
  templates: [] as ReturnType<typeof makeTemplate>[],
  loading: false,
}));

vi.mock("@/modules/template/presentation/hooks/use-templates", () => ({
  useTemplates: () => templatesState,
}));

vi.mock("@/shared/presentation/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/presentation/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <div data-testid="select-root" data-value={value}>
      <button type="button" onClick={() => onValueChange("template-1")}>
        select-template
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("RecordDocumentSelectorModal", () => {
  beforeEach(() => {
    resetFactories();
    vi.clearAllMocks();
    vi.stubGlobal("window", { open: vi.fn() });
    templatesState.loading = false;
    templatesState.templates = [
      makeTemplate({
        id: "template-1",
        collectionId: "collection-1",
        name: "Contrato",
      }),
    ];
  });

  it("navigates to the document editor for the selected template", () => {
    const onOpenChange = vi.fn();

    render(
      <RecordDocumentSelectorModal
        collectionId="collection-1"
        isOpen
        onOpenChange={onOpenChange}
        recordId="record-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "select-template" }));
    fireEvent.click(screen.getByRole("button", { name: /Abrir/i }));

    expect(window.open).toHaveBeenCalledWith(
      "/collections/collection-1/records/record-1/documents/template-1",
      "_blank",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
