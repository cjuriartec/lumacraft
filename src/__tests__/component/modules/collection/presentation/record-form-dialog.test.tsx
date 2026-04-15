import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeField, makeRecord, resetFactories } from "@/__tests__/factories/domain-factories";
import { RecordFormDialog } from "@/modules/collection/presentation/components/record-form-dialog";

const createRecordExecute = vi.hoisted(() => vi.fn());

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
  getPublicUrl: vi.fn().mockReturnValue({ ok: true, value: "https://example.com" }),
}));

const workspaceState = vi.hoisted(() => ({
  currentWorkspace: { id: "workspace-1" },
}));

const permissionsState = vi.hoisted(() => ({
  can: vi.fn(() => true),
}));

const collectionsState = vi.hoisted(() => ({
  collections: [] as Array<{
    id: string;
    name: string;
    displayName?: string;
    primaryFieldName?: string | null;
  }>,
}));

const fieldsState = vi.hoisted(() => ({
  fields: [] as Array<ReturnType<typeof makeField>>,
  loading: false,
}));

vi.mock("@/modules/collection/presentation/hooks/use-relation-records", () => ({
  useRelationRecords: () => relationRecordsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-storage", () => ({
  useStorage: () => storageState,
}));

vi.mock("@/modules/collection/presentation/components/record-quick-view-dialog", () => ({
  RecordQuickViewDialog: () => null,
}));

vi.mock("@/modules/workspace/presentation/providers/workspace-provider", () => ({
  useWorkspace: () => workspaceState,
}));

vi.mock("@/modules/auth/presentation/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
  }),
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => permissionsState,
}));

vi.mock("@/shared/presentation/providers/supabase-provider", () => ({
  useSupabase: () => ({
    supabase: {},
  }),
}));

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => collectionsState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-fields", () => ({
  useFields: (collectionId: string) => ({
    fields: collectionId ? fieldsState.fields : [],
    loading: fieldsState.loading,
  }),
}));

vi.mock("@/modules/collection/application/collection-use-case.factory", () => ({
  CollectionUseCaseFactory: {
    create: () => ({
      createRecord: () => ({
        execute: createRecordExecute,
      }),
    }),
  },
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
  DialogContent: ({ children }: { children: ReactNode }) => (
    createPortal(<div data-testid="dialog-content">{children}</div>, document.body)
  ),
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
    collectionsState.collections = [];
    fieldsState.fields = [];
    fieldsState.loading = false;
    permissionsState.can.mockReturnValue(true);
    createRecordExecute.mockReset();
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

  it("shows resolved reverse lookups in read-only mode even when they are not stored in record.data", async () => {
    const reverseLookupField = makeField({
      id: "field-2",
      collectionId: "collection-1",
      name: "orders_inverse",
      displayName: "Pedidos vinculados",
      fieldType: "REVERSE_LOOKUP",
      config: {
        targetCollectionId: "11111111-1111-4111-8111-111111111111",
        targetFieldId: "33333333-3333-4333-8333-333333333333",
      },
    });
    const record = makeRecord({
      id: "record-2",
      collectionId: "collection-1",
      data: {},
    });

    relationRecordsState.options = {
      orders_inverse: [{ id: "order-1", label: "Pedido 001" }],
    };

    render(
      <RecordFormDialog
        open={true}
        onOpenChange={vi.fn()}
        fields={[reverseLookupField]}
        record={record}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    await waitFor(() => {
      expect(relationRecordsState.findReverseRelations).toHaveBeenCalledWith(
        reverseLookupField,
        "record-2",
      );
    });

    expect(screen.getByText("Pedido 001")).toBeInTheDocument();
    expect(screen.queryByText("Sin vínculos inversos actualmente")).not.toBeInTheDocument();
  });

  it("shows quick create actions when relation config and create permission are available", async () => {
    const relationField = makeField({
      id: "field-quick-1",
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

    collectionsState.collections = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "customers",
        displayName: "Clientes",
        primaryFieldName: "name",
      },
    ];

    render(
      <RecordFormDialog
        open={true}
        onOpenChange={vi.fn()}
        fields={[relationField]}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    expect(screen.getByRole("button", { name: "Nuevo en Clientes" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Escribe para buscar registros..."), {
      target: { value: "Acme" },
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Crear en Clientes" })).toBeInTheDocument();
    });
  });

  it("hides quick create actions when the user lacks create permission", () => {
    permissionsState.can.mockReturnValue(false);

    const relationField = makeField({
      id: "field-quick-2",
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

    collectionsState.collections = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "customers",
        displayName: "Clientes",
        primaryFieldName: "name",
      },
    ];

    render(
      <RecordFormDialog
        open={true}
        onOpenChange={vi.fn()}
        fields={[relationField]}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    expect(screen.queryByRole("button", { name: "Nuevo en Clientes" })).not.toBeInTheDocument();
  });

  it("quick creates a related singular record and auto-selects it", async () => {
    const relationField = makeField({
      id: "field-quick-3",
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

    const targetPrimaryField = makeField({
      id: "field-target-1",
      collectionId: "11111111-1111-4111-8111-111111111111",
      name: "name",
      displayName: "Nombre",
      fieldType: "TEXT",
      isRequired: true,
    });
    const targetReverseField = makeField({
      id: "field-target-2",
      collectionId: "11111111-1111-4111-8111-111111111111",
      name: "orders",
      displayName: "Pedidos",
      fieldType: "REVERSE_LOOKUP",
      config: {
        targetCollectionId: "22222222-2222-4222-8222-222222222222",
        targetFieldId: "33333333-3333-4333-8333-333333333333",
      },
    });

    collectionsState.collections = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "customers",
        displayName: "Clientes",
        primaryFieldName: "name",
      },
    ];
    fieldsState.fields = [targetPrimaryField, targetReverseField];

    createRecordExecute.mockResolvedValue({
      ok: true,
      value: makeRecord({
        id: "44444444-4444-4444-8444-444444444444",
        collectionId: "11111111-1111-4111-8111-111111111111",
        data: { name: "Acme" },
      }),
    });

    relationRecordsState.fetchOptionsByIds.mockImplementation(async (_field, ids: string[]) => {
      relationRecordsState.options = {
        customer_id: [{ id: ids[0], label: "Acme" }],
      };
    });

    render(
      <RecordFormDialog
        open={true}
        onOpenChange={vi.fn()}
        fields={[relationField]}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Escribe para buscar registros..."), {
      target: { value: "Acme" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Nuevo en Clientes" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Nuevo en Clientes" })).toBeInTheDocument();
    });

    const dialogContents = screen.getAllByTestId("dialog-content");
    const quickCreateDialog = dialogContents[dialogContents.length - 1];
    const quickCreateScope = within(quickCreateDialog);

    const nameInputs = quickCreateScope.getAllByDisplayValue("Acme");
    expect(nameInputs.length).toBeGreaterThan(0);
    expect(quickCreateScope.queryByText("Pedidos")).not.toBeInTheDocument();

    fireEvent.click(quickCreateScope.getByRole("button", { name: "Crear y vincular" }));

    await waitFor(() => {
      expect(createRecordExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          collectionId: "11111111-1111-4111-8111-111111111111",
          accountId: "workspace-1",
          data: expect.objectContaining({ name: "Acme" }),
          userId: "user-1",
        }),
      );
    });

    await waitFor(() => {
      expect(relationRecordsState.fetchOptionsByIds).toHaveBeenCalledWith(relationField, [
        "44444444-4444-4444-8444-444444444444",
      ]);
      expect(screen.getAllByText("Acme").length).toBeGreaterThan(0);
    });
  });

  it("quick creates a related multi record and appends it to the selected badges", async () => {
    const relationField = makeField({
      id: "field-quick-4",
      collectionId: "collection-1",
      name: "tags",
      displayName: "Etiquetas",
      fieldType: "RELATION",
      config: {
        targetCollectionId: "11111111-1111-4111-8111-111111111111",
        relationType: "MANY_TO_MANY",
        displayField: "name",
      },
    });

    const existingId = "55555555-5555-4555-8555-555555555555";
    const createdId = "66666666-6666-4666-8666-666666666666";

    collectionsState.collections = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "tags",
        displayName: "Etiquetas",
        primaryFieldName: "name",
      },
    ];
    fieldsState.fields = [
      makeField({
        id: "field-target-3",
        collectionId: "11111111-1111-4111-8111-111111111111",
        name: "name",
        displayName: "Nombre",
        fieldType: "TEXT",
        isRequired: true,
      }),
    ];

    createRecordExecute.mockResolvedValue({
      ok: true,
      value: makeRecord({
        id: createdId,
        collectionId: "11111111-1111-4111-8111-111111111111",
        data: { name: "Urgente" },
      }),
    });

    relationRecordsState.options = {
      tags: [{ id: existingId, label: "Base" }],
    };
    relationRecordsState.fetchOptionsByIds.mockImplementation(async (_field, ids: string[]) => {
      relationRecordsState.options.tags = [
        { id: existingId, label: "Base" },
        ...ids
          .filter((id) => id === createdId)
          .map((id) => ({ id, label: "Urgente" })),
      ];
    });

    render(
      <RecordFormDialog
        open={true}
        onOpenChange={vi.fn()}
        fields={[relationField]}
        record={makeRecord({
          id: "record-5",
          collectionId: "collection-1",
          data: {
            tags: [existingId],
          },
        })}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Escribe para buscar registros..."), {
      target: { value: "Urgente" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Nuevo en Etiquetas" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Nuevo en Etiquetas" })).toBeInTheDocument();
    });

    const dialogContents = screen.getAllByTestId("dialog-content");
    const quickCreateDialog = dialogContents[dialogContents.length - 1];
    const quickCreateScope = within(quickCreateDialog);

    fireEvent.click(quickCreateScope.getByRole("button", { name: "Crear y vincular" }));

    await waitFor(() => {
      expect(screen.getAllByText("Base").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Urgente").length).toBeGreaterThan(0);
    });
  });

  it("surfaces quick create errors without altering the current relation selection", async () => {
    const relationField = makeField({
      id: "field-quick-5",
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

    collectionsState.collections = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "customers",
        displayName: "Clientes",
        primaryFieldName: "name",
      },
    ];
    fieldsState.fields = [
      makeField({
        id: "field-target-4",
        collectionId: "11111111-1111-4111-8111-111111111111",
        name: "name",
        displayName: "Nombre",
        fieldType: "TEXT",
        isRequired: true,
      }),
    ];

    createRecordExecute.mockResolvedValue({
      ok: false,
      error: new Error("No se pudo crear el relacionado"),
    });

    render(
      <RecordFormDialog
        open={true}
        onOpenChange={vi.fn()}
        fields={[relationField]}
        record={makeRecord({
          id: "record-6",
          collectionId: "collection-1",
          data: {
            customer_id: "77777777-7777-4777-8777-777777777777",
          },
        })}
        onSubmit={vi.fn().mockResolvedValue({ ok: true })}
      />,
    );

    expect(
      screen.getByText("ID Vinculado: 77777777-7777-4777-8777-777777777777"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Nuevo en Clientes" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Nuevo en Clientes" })).toBeInTheDocument();
    });

    const dialogContents = screen.getAllByTestId("dialog-content");
    const quickCreateDialog = dialogContents[dialogContents.length - 1];
    const quickCreateScope = within(quickCreateDialog);

    fireEvent.change(quickCreateScope.getByLabelText("Nombre"), {
      target: { value: "Cliente fallido" },
    });
    fireEvent.click(quickCreateScope.getByRole("button", { name: "Crear y vincular" }));

    await waitFor(() => {
      expect(createRecordExecute).toHaveBeenCalled();
      expect(
        quickCreateScope.getByText("No se pudo crear el relacionado"),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("ID Vinculado: 77777777-7777-4777-8777-777777777777"),
    ).toBeInTheDocument();
  });
});
