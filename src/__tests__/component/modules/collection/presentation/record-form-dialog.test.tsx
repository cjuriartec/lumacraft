import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeField, makeRecord, resetFactories } from "@/__tests__/factories/domain-factories";
import { RecordFormDialog } from "@/modules/collection/presentation/components/record-form-dialog";

const relationRecordsState = vi.hoisted(() => ({
  options: {} as Record<string, { id: string; label: string }[]>,
  loading: {} as Record<string, boolean>,
  searchRelations: vi.fn(),
  fetchOptionsByIds: vi.fn(),
  findReverseRelations: vi.fn(),
}));

const storageState = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  deleteFiles: vi.fn(),
}));

const workspaceState = vi.hoisted(() => ({
  currentWorkspace: { id: "workspace-1" },
}));

vi.mock("@/modules/collection/presentation/hooks/use-relation-records", () => ({
  useRelationRecords: () => relationRecordsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-storage", () => ({
  useStorage: () => storageState,
}));

vi.mock("@/modules/workspace/presentation/providers/workspace-provider", () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock("@/shared/presentation/components/ui/badge", () => ({
  Badge: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <div {...props}>{children}</div>
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
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock("@/shared/presentation/components/ui/label", () => ({
  Label: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock("@/shared/presentation/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? ""}</span>,
}));

vi.mock("@/shared/presentation/components/ui/switch", () => ({
  Switch: ({ ...props }: Record<string, unknown>) => <input type="checkbox" {...props} />,
}));

vi.mock("@/shared/presentation/components/ui/textarea", () => ({
  Textarea: (props: Record<string, unknown>) => <textarea {...props} />,
}));

describe("RecordFormDialog", () => {
  beforeEach(() => {
    resetFactories();
    vi.clearAllMocks();
    relationRecordsState.options = {};
    relationRecordsState.loading = {};
  });

  it("renders and clears a preselected singular relation even without loaded options", async () => {
    const relationField = makeField({
      id: "field-1",
      collectionId: "collection-1",
      name: "customer_id",
      displayName: "Cliente",
      fieldType: "RELATION",
      config: {
        targetCollectionId: "11111111-1111-4111-8111-111111111111",
        relationType: "MANY_TO_ONE",
        displayField: "name",
      },
    });
    const linkedRecordId = "22222222-2222-4222-8222-222222222222";
    const record = makeRecord({
      id: "record-1",
      collectionId: "collection-1",
      data: {
        customer_id: linkedRecordId,
      },
    });

    render(
      <RecordFormDialog
        open={true}
        onOpenChange={vi.fn()}
        fields={[relationField]}
        record={record}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    await waitFor(() => {
      expect(relationRecordsState.searchRelations).toHaveBeenCalledWith(relationField, "");
      expect(relationRecordsState.fetchOptionsByIds).toHaveBeenCalledWith(relationField, [
        linkedRecordId,
      ]);
    });

    expect(screen.getByText(`ID Vinculado: ${linkedRecordId}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));

    await waitFor(() => {
      expect(screen.queryByText(`ID Vinculado: ${linkedRecordId}`)).not.toBeInTheDocument();
    });
  });
});
