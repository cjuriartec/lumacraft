import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TemplatePreviewPanel } from "@/modules/template/presentation/components/template-preview-panel";

const setValue = vi.fn();

vi.mock("@platejs/resizable", () => ({
  ResizableProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("platejs/react", () => ({
  Plate: ({ children }: { children: ReactNode }) => (
    <div data-testid="preview-plate">{children}</div>
  ),
  usePlateEditor: () => ({
    tf: {
      setValue,
    },
  }),
}));

vi.mock("@/shared/presentation/components/editor/plugins/extended-nodes-kit", () => ({
  ExtendedNodesKit: [],
}));

vi.mock("@/shared/presentation/components/ui/editor", () => ({
  Editor: () => <div data-testid="preview-editor" />,
  EditorContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("TemplatePreviewPanel", () => {
  beforeEach(() => {
    setValue.mockReset();
  });

  it("shows a skeleton while the preview is loading", () => {
    render(<TemplatePreviewPanel blocks={[]} loading error={null} warnings={[]} />);

    expect(screen.getByTestId("template-preview-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("preview-editor")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no blocks and it is not loading", () => {
    render(<TemplatePreviewPanel blocks={[]} loading={false} error={null} warnings={[]} />);

    expect(screen.getByText("Selecciona un registro para previsualizar")).toBeInTheDocument();
  });

  it("renders the preview document when compiled blocks are available", () => {
    render(
      <TemplatePreviewPanel
        blocks={[{ type: "p", children: [{ text: "Contenido renderizado" }] }]}
        loading={false}
        error={null}
        warnings={[]}
      />,
    );

    expect(screen.getByTestId("preview-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("template-preview-skeleton")).not.toBeInTheDocument();
  });
});
