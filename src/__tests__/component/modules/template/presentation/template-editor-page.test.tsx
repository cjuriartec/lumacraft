import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeTemplate, resetFactories } from "@/__tests__/factories/domain-factories";
import type { Template } from "@/modules/template/domain/entities/template.entity";
import { JsonArray } from "@/modules/template/domain/types/template-blocks";
import TemplateEditorPage from "@/modules/template/presentation/pages/template-editor-page";

const templateEditorState = vi.hoisted(() => ({
  template: null as Template | null,
  loading: false,
  saveStatus: "idle" as "idle" | "saving" | "saved" | "error",
  handleBlocksChange: vi.fn(),
  updateName: vi.fn(),
}));

const collectionsState = vi.hoisted(() => ({
  collections: [] as Array<{
    id: string;
    name: string;
    displayName?: string;
    primaryFieldName?: string | null;
  }>,
}));

const previewState = vi.hoisted(() => ({
  records: [] as Array<{ id: string; data: Record<string, unknown> }>,
  recordsLoading: false,
  selectedRecordId: "",
  setSelectedRecordId: vi.fn(),
  loading: false,
  error: null as string | null,
  warnings: [] as string[],
  requestId: null as string | null,
  blockStates: [] as Array<{
    blockId: string;
    blockIndex: number;
    blockType: string;
    status: "pending" | "resolved" | "error";
  }>,
  blocks: [] as JsonArray,
  generate: vi.fn(),
  cancel: vi.fn(),
}));

const plateEditorState = vi.hoisted(() => ({
  children: [] as Array<Record<string, unknown>>,
}));

const variableCatalogState = vi.hoisted(() => ({
  loading: false,
  nodes: [],
}));

vi.mock("@/modules/template/presentation/hooks/use-template-editor", () => ({
  useTemplateEditor: () => templateEditorState,
}));

vi.mock("@/modules/template/presentation/hooks/use-template-preview", () => ({
  useTemplatePreview: () => previewState,
}));

vi.mock("@/modules/template/presentation/hooks/use-variable-fields", () => ({
  useVariableFields: () => variableCatalogState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => collectionsState,
}));

vi.mock("@/modules/authorization/presentation/providers/permission-provider", () => ({
  usePermissions: () => ({
    can: () => true,
    isOwner: true,
    isSuperAdmin: false,
  }),
}));

vi.mock("@/shared/presentation/providers/breadcrumb-provider", () => ({
  useBreadcrumbs: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("platejs/react", () => ({
  createPlatePlugin: () => ({
    configure: () => ({
      configure: () => ({}),
      extend: () => ({
        configure: () => ({}),
      }),
    }),
    extend: () => ({
      configure: () => ({
        configure: () => ({}),
        extend: () => ({
          configure: () => ({}),
        }),
      }),
    }),
  }),
  Plate: ({ children }: { children: ReactNode }) => <div data-testid="plate">{children}</div>,
  usePlateEditor: () => ({
    children: plateEditorState.children,
    tf: {
      setValue: vi.fn(),
      insertNodes: vi.fn(),
      focus: vi.fn(),
    },
  }),
}));

vi.mock("@/modules/template/presentation/components/template-preview-panel", () => ({
  TemplatePreviewPanel: () => <div data-testid="template-preview-panel" />,
}));

vi.mock("@/shared/presentation/components/editor/plugins/dnd-kit", () => ({
  DndKit: [],
}));

vi.mock("@/modules/template/presentation/components/slash-command/slash-plugin", () => ({
  SlashPlugin: {},
  SlashInputPlugin: {
    withComponent: () => ({}),
  },
}));

vi.mock("@/modules/template/presentation/components/slash-command/slash-input-element", () => ({
  SlashInputElement: () => <span data-testid="slash-input" />,
}));

vi.mock("@/modules/template/presentation/components/template-logic-blocks", () => ({
  TemplateLogicBlocksPluginKit: [],
  TEMPLATE_CONDITIONAL_TYPE: "template_conditional",
  TEMPLATE_LIST_TYPE: "template_list",
  TEMPLATE_SWITCH_TYPE: "template_switch",
  TEMPLATE_AI_TYPE: "template_ai",
  createConditionalElement: () => ({ type: "template_conditional", children: [{ text: "" }] }),
  createListElement: () => ({ type: "template_list", children: [{ text: "" }] }),
  createSwitchElement: () => ({ type: "template_switch", children: [{ text: "" }] }),
  createAIElement: () => ({ type: "template_ai", children: [{ text: "" }] }),
  TemplateConditionalElement: () => <div data-testid="conditional-element" />,
  TemplateListElement: () => <div data-testid="list-element" />,
  TemplateSwitchElement: () => <div data-testid="switch-element" />,
  TemplateAIElement: () => <div data-testid="ai-element" />,
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
  ToolbarButton: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

vi.mock("@/shared/presentation/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/presentation/components/ui/align-toolbar-button", () => ({
  AlignToolbarButton: () => <button type="button">align</button>,
}));

vi.mock("@/shared/presentation/components/ui/font-color-toolbar-button", () => ({
  FontColorToolbarButton: () => <button type="button">font-color</button>,
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

vi.mock("@/shared/presentation/components/ui/media-toolbar-button", () => ({
  MediaToolbarButton: () => <button type="button">media</button>,
}));

vi.mock("@/shared/presentation/components/ui/table-toolbar-button", () => ({
  TableToolbarButton: () => <button type="button">table</button>,
}));

vi.mock("@/shared/presentation/components/ui/turn-into-toolbar-button", () => ({
  TurnIntoToolbarButton: () => <button type="button">turn-into</button>,
}));

vi.mock("@/modules/template/presentation/components/variable-selector", () => ({
  VariableSelector: ({
    collectionId,
    disabled,
  }: {
    collectionId?: string | null;
    disabled?: boolean;
  }) => (
    <button data-testid="variable-selector" disabled={disabled}>
      {collectionId ?? "sin-coleccion"}
    </button>
  ),
}));

vi.mock("@/shared/presentation/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange: (v: string) => void;
  }) => (
    <div data-testid="select-mock" data-value={value} onClick={() => onValueChange("mock-value")}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ children, placeholder }: { children?: ReactNode; placeholder?: string }) => (
    <span>{children || placeholder}</span>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <option value={value} role="option">
      {children}
    </option>
  ),
}));

describe("TemplateEditorPage", () => {
  beforeEach(() => {
    resetFactories();
    templateEditorState.loading = false;
    templateEditorState.saveStatus = "idle";
    templateEditorState.handleBlocksChange.mockReset();
    templateEditorState.updateName.mockReset();
    previewState.setSelectedRecordId.mockReset();
    previewState.generate.mockReset();
    previewState.cancel.mockReset();
    previewState.records = [];
    previewState.recordsLoading = false;
    previewState.selectedRecordId = "";
    previewState.loading = false;
    previewState.error = null;
    previewState.warnings = [];
    previewState.requestId = null;
    previewState.blockStates = [];
    plateEditorState.children = [];
    variableCatalogState.loading = false;
    variableCatalogState.nodes = [];
    templateEditorState.template = makeTemplate({
      id: "template-1",
      collectionId: null,
      blocks: [],
      name: "Contrato Base",
    });
    collectionsState.collections = [];
  });

  it("disables variable insertion when template has no collection linked", () => {
    render(<TemplateEditorPage templateId="template-1" />);

    expect(screen.getByTestId("variable-selector")).toBeDisabled();
    expect(screen.getByText("Vincula una colección para insertar variables.")).toBeInTheDocument();
    expect(screen.getByText("indent")).toBeInTheDocument();
    expect(screen.getByText("outdent")).toBeInTheDocument();
    expect(screen.getByText("font-family")).toBeInTheDocument();
    expect(screen.getAllByText("font-color")).toHaveLength(2);
  });

  it("shows the collection primary field as record label in preview selector", () => {
    templateEditorState.template = makeTemplate({
      id: "template-1",
      collectionId: "collection-1",
      blocks: [],
      name: "Contrato Base",
    });

    collectionsState.collections = [
      {
        id: "collection-1",
        name: "clientes",
        displayName: "Clientes",
        primaryFieldName: "nombre",
      },
    ];

    previewState.records = [
      {
        id: "c6f6f5ca-1f76-4d76-b09e-2eb927f98a11",
        data: {
          nombre: "Juanito Alcachofa",
        },
      },
    ];
    previewState.selectedRecordId = "c6f6f5ca-1f76-4d76-b09e-2eb927f98a11";

    render(<TemplateEditorPage templateId="template-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Vista Previa/i }));

    expect(screen.getByRole("option", { name: "Juanito Alcachofa" })).toBeInTheDocument();
  });

  it("generates preview with the current editor blocks instead of persisted template blocks", () => {
    templateEditorState.template = makeTemplate({
      id: "template-1",
      collectionId: "collection-1",
      blocks: [{ type: "p", children: [{ text: "Persistido" }] }] as JsonArray,
      name: "Contrato Base",
    });

    collectionsState.collections = [
      {
        id: "collection-1",
        name: "clientes",
        displayName: "Clientes",
        primaryFieldName: "nombre",
      },
    ];

    previewState.records = [
      {
        id: "record-1",
        data: {
          nombre: "Ana",
        },
      },
    ];
    previewState.selectedRecordId = "record-1";
    plateEditorState.children = [{ type: "p", children: [{ text: "Desde editor" }] }];

    render(<TemplateEditorPage templateId="template-1" />);

    fireEvent.click(screen.getByRole("button", { name: /Vista Previa/i }));

    expect(previewState.generate).toHaveBeenCalledWith([
      { type: "p", children: [{ text: "Desde editor" }] },
    ]);
  });
});
