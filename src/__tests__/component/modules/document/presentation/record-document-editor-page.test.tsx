import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RecordDocumentEditorPage from "@/modules/document/presentation/pages/record-document-editor-page";

const documentState = vi.hoisted(() => ({
  payload: {
    document: {
      id: "doc-1",
      accountId: "workspace-1",
      collectionId: "collection-1",
      recordId: "record-1",
      templateId: "template-1",
      compiledBlocks: [{ type: "p", children: [{ text: "Compilado" }] }],
      editedBlocks: [{ type: "p", children: [{ text: "Editado" }] }],
      sourceTemplateVersion: 1,
      version: 2,
      compiledAt: "2024-01-01T00:00:00.000Z",
      lastEditedAt: "2024-01-01T00:00:00.000Z",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    },
    template: {
      id: "template-1",
      name: "Contrato Persistido",
      collectionId: "collection-1",
      version: 1,
    },
    record: {
      id: "record-1",
      label: "Cliente Uno",
    },
    permissions: {
      canRead: true,
      canUpdate: true,
    },
    warnings: [],
  },
  loading: false,
  loadingPhase: "loading" as const,
  error: null as string | null,
  saveStatus: "idle" as "idle" | "saving" | "saved" | "error",
  regenerating: false,
  editorRevision: 1,
  handleBlocksChange: vi.fn(),
  flushPendingSave: vi.fn(async () => true),
  regenerate: vi.fn(async () => true),
  reload: vi.fn(),
  pdfUrl: "/api/documents/doc-1/pdf",
}));

const collectionState = vi.hoisted(() => ({
  collections: [
    {
      id: "collection-1",
      name: "clientes",
      displayName: "Clientes",
    },
  ],
}));

const breadcrumbState = vi.hoisted(() => ({
  useBreadcrumbs: vi.fn(),
}));

const plateState = vi.hoisted(() => ({
  onChange: null as null | ((args: { value: unknown }) => void),
  triggerChange(value: unknown) {
    this.onChange?.({ value });
  },
}));

const setValue = vi.fn((value: unknown) => {
  plateState.triggerChange(value);
});

vi.mock("@/modules/document/presentation/hooks/use-record-document", () => ({
  useRecordDocument: () => documentState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => collectionState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-collection-workspace-guard", () => ({
  useCollectionWorkspaceGuard: () => false,
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: breadcrumbState.useBreadcrumbs,
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("platejs/react", () => ({
  Plate: ({
    children,
    onChange,
  }: {
    children: ReactNode;
    onChange?: (args: { value: unknown }) => void;
  }) => {
    plateState.onChange = onChange ?? null;
    return <div data-testid="plate">{children}</div>;
  },
  usePlateEditor: () => ({
    tf: {
      setValue,
    },
  }),
}));

vi.mock("@platejs/resizable", () => ({
  ResizableProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/presentation/components/editor/plugins/dnd-kit", () => ({
  DndKit: [],
}));

vi.mock("@/shared/presentation/components/editor/plugins/extended-nodes-kit", () => ({
  ExtendedNodesKit: [],
}));

vi.mock("@/shared/presentation/components/ui/button", () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: {
    children: ReactNode;
    asChild?: boolean;
    [key: string]: unknown;
  }) => (asChild ? <span {...props}>{children}</span> : <button {...props}>{children}</button>),
}));

vi.mock("@/shared/presentation/components/ui/editor", () => ({
  Editor: () => <div data-testid="editor" />,
  EditorContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/presentation/components/ui/fixed-toolbar", () => ({
  FixedToolbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/presentation/components/ui/toolbar", () => ({
  ToolbarGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/presentation/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/presentation/components/ui/alert-dialog", () => {
  const AlertDialogContext = React.createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>({
    open: false,
    onOpenChange: () => undefined,
  });

  return {
    AlertDialog: ({
      children,
      open = false,
      onOpenChange = () => undefined,
    }: {
      children: ReactNode;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    }) => (
      <AlertDialogContext.Provider value={{ open, onOpenChange }}>
        {children}
      </AlertDialogContext.Provider>
    ),
    AlertDialogContent: ({ children }: { children: ReactNode }) => {
      const context = React.useContext(AlertDialogContext);
      return context.open ? <div>{children}</div> : null;
    },
    AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    AlertDialogCancel: ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => {
      const context = React.useContext(AlertDialogContext);

      return (
        <button type="button" disabled={disabled} onClick={() => context.onOpenChange(false)}>
          {children}
        </button>
      );
    },
    AlertDialogAction: ({
      children,
      disabled,
      onClick,
    }: {
      children: ReactNode;
      disabled?: boolean;
      onClick?: (event: { preventDefault: () => void }) => void;
    }) => (
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onClick?.({
            preventDefault: () => undefined,
          })
        }
      >
        {children}
      </button>
    ),
  };
});

vi.mock("@/shared/presentation/components/ui/align-toolbar-button", () => ({
  AlignToolbarButton: () => <button type="button">align</button>,
}));

vi.mock("@/shared/presentation/components/ui/font-color-toolbar-button", () => ({
  FontColorToolbarButton: ({ children }: { children?: ReactNode }) => (
    <button type="button">{children ?? "font-color"}</button>
  ),
}));

vi.mock("@/modules/template/presentation/components/font-family-toolbar-button", () => ({
  FontFamilyToolbarButton: () => <button type="button">font-family</button>,
}));

vi.mock("@/shared/presentation/components/ui/font-size-toolbar-button", () => ({
  FontSizeToolbarButton: () => <button type="button">font-size</button>,
}));

vi.mock("@/shared/presentation/components/ui/history-toolbar-button", () => ({
  UndoToolbarButton: () => <button type="button">undo</button>,
  RedoToolbarButton: () => <button type="button">redo</button>,
}));

vi.mock("@/shared/presentation/components/ui/indent-toolbar-button", () => ({
  IndentToolbarButton: () => <button type="button">indent</button>,
  OutdentToolbarButton: () => <button type="button">outdent</button>,
}));

vi.mock("@/shared/presentation/components/ui/line-height-toolbar-button", () => ({
  LineHeightToolbarButton: () => <button type="button">line-height</button>,
}));

vi.mock("@/shared/presentation/components/ui/paragraph-spacing-toolbar-button", () => ({
  ParagraphSpacingToolbarButton: () => <button type="button">paragraph-spacing</button>,
}));

vi.mock("@/shared/presentation/components/ui/link-toolbar-button", () => ({
  LinkToolbarButton: () => <button type="button">link</button>,
}));

vi.mock("@/shared/presentation/components/ui/list-toolbar-button", () => ({
  BulletedListToolbarButton: () => <button type="button">bulleted</button>,
  NumberedListToolbarButton: () => <button type="button">numbered</button>,
}));

vi.mock("@/shared/presentation/components/ui/mark-toolbar-button", () => ({
  MarkToolbarButton: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/shared/presentation/components/ui/table-toolbar-button", () => ({
  TableToolbarButton: () => <button type="button">table</button>,
}));

vi.mock("@/shared/presentation/components/ui/turn-into-toolbar-button", () => ({
  TurnIntoToolbarButton: () => <button type="button">turn-into</button>,
}));

vi.mock("@/modules/template/presentation/lib/template-blocks.adapter", () => ({
  templateBlocksToPlateValue: (value: unknown) => value,
  plateValueToTemplateBlocks: (value: unknown) => value,
}));

describe("RecordDocumentEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documentState.payload.permissions.canUpdate = true;
    documentState.payload.document.sourceTemplateVersion = 1;
    documentState.payload.template.version = 1;
    documentState.saveStatus = "idle";
    documentState.loading = false;
    documentState.error = null;
    documentState.regenerating = false;
    documentState.regenerate = vi.fn(async () => true);
    documentState.flushPendingSave = vi.fn(async () => true);
    plateState.onChange = null;
  });

  it("registers a breadcrumb link back to the record detail page", () => {
    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    expect(breadcrumbState.useBreadcrumbs).toHaveBeenCalledWith([
      { label: "Colecciones", href: "/collections" },
      { label: "Clientes", href: "/collections/collection-1" },
      { label: "Cliente Uno", href: "/collections/collection-1/records/record-1" },
      { label: "Contrato Persistido" },
    ]);
  });

  it("links the back button to the record detail page", () => {
    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/collections/collection-1/records/record-1",
    );
  });

  it("renders the persisted document header and pdf action", () => {
    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    expect(screen.getByText("Contrato Persistido")).toBeInTheDocument();
    expect(screen.getByText("Cliente Uno")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Descargar PDF/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Regenerar/i })[0]).toBeInTheDocument();
    expect(screen.getByText("paragraph-spacing")).toBeInTheDocument();
  });

  it("waits for pending saves before opening the PDF", async () => {
    const openedWindow = {
      close: vi.fn(),
      location: { href: "" },
      opener: null,
    } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(openedWindow);

    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Descargar PDF/i }));

    await waitFor(() => {
      expect(documentState.flushPendingSave).toHaveBeenCalled();
    });

    expect(openSpy).toHaveBeenCalledWith("", "_blank");
    expect(openedWindow.location.href).toBe("/api/documents/doc-1/pdf");
  });

  it("confirms regeneration from the editor", async () => {
    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Regenerar/i })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^Regenerar$/i })[1]);

    await waitFor(() => {
      expect(documentState.regenerate).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.queryByText("Regenerar documento")).not.toBeInTheDocument();
    });
  });

  it("warns when the document was compiled from an older template version", () => {
    documentState.payload.document.sourceTemplateVersion = 1;
    documentState.payload.template.version = 2;

    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    expect(
      screen.getAllByText(
        (_, element) =>
          element?.textContent ===
          "Este documento fue compilado con la versión 1 del template. La versión actual es 2. Usa Regenerar para aplicar los cambios más recientes.",
      ),
    ).not.toHaveLength(0);
  });

  it("shows a loading state while regenerating from the modal", () => {
    const view = render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Regenerar/i })[0]);

    documentState.regenerating = true;
    view.rerender(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    expect(screen.getAllByRole("button", { name: /Regenerando\.\.\./i })[0]).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDisabled();
  });

  it("ignores editor change events caused by server sync", () => {
    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    expect(setValue).toHaveBeenCalledWith(documentState.payload.document.editedBlocks);
    expect(documentState.handleBlocksChange).not.toHaveBeenCalled();
  });

  it("forwards user edits to the autosave handler", async () => {
    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    await Promise.resolve();
    const nextBlocks = [{ type: "p", children: [{ text: "Cambio manual" }] }];
    plateState.triggerChange(nextBlocks);

    expect(documentState.handleBlocksChange).toHaveBeenCalledWith(nextBlocks);
  });

  it("hides editing controls in read-only mode", () => {
    documentState.payload.permissions.canUpdate = false;

    render(
      <RecordDocumentEditorPage
        collectionId="collection-1"
        recordId="record-1"
        templateId="template-1"
      />,
    );

    expect(screen.getByText("Solo lectura")).toBeInTheDocument();
    expect(screen.queryByText("font-family")).not.toBeInTheDocument();
  });
});
