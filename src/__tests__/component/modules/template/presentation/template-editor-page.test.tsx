import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeTemplate, resetFactories } from "@/__tests__/factories/domain-factories";
import type { Template } from "@/modules/template/domain/entities/template.entity";
import TemplateEditorPage from "@/modules/template/presentation/pages/template-editor-page";

const templateEditorState = vi.hoisted(() => ({
  template: null as Template | null,
  loading: false,
  saveStatus: "idle" as "idle" | "saving" | "saved" | "error",
  handleBlocksChange: vi.fn(),
  updateName: vi.fn(),
}));

const collectionsState = vi.hoisted(() => ({
  collections: [] as Array<{ id: string; name: string; displayName?: string }>,
}));

vi.mock("@/modules/template/presentation/hooks/use-template-editor", () => ({
  useTemplateEditor: () => templateEditorState,
}));

vi.mock("@/modules/collection/presentation/hooks/use-collections", () => ({
  useCollections: () => collectionsState,
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
    tf: {
      setValue: vi.fn(),
      insertNodes: vi.fn(),
      focus: vi.fn(),
    },
  }),
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

vi.mock("@/shared/presentation/components/ui/align-toolbar-button", () => ({
  AlignToolbarButton: () => <button type="button">align</button>,
}));

vi.mock("@/shared/presentation/components/ui/font-color-toolbar-button", () => ({
  FontColorToolbarButton: () => <button type="button">font-color</button>,
}));

vi.mock("@/shared/presentation/components/ui/font-size-toolbar-button", () => ({
  FontSizeToolbarButton: () => <button type="button">font-size</button>,
}));

vi.mock("@/shared/presentation/components/ui/history-toolbar-button", () => ({
  UndoToolbarButton: () => <button type="button">undo</button>,
  RedoToolbarButton: () => <button type="button">redo</button>,
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

describe("TemplateEditorPage", () => {
  beforeEach(() => {
    resetFactories();
    templateEditorState.loading = false;
    templateEditorState.saveStatus = "idle";
    templateEditorState.handleBlocksChange.mockReset();
    templateEditorState.updateName.mockReset();
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
  });
});
