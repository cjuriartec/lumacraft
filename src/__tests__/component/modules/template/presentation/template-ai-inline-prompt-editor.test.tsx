import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { TemplateAIInlinePromptEditor } from "@/modules/template/presentation/components/template-logic-blocks";

vi.mock("platejs/react", () => ({
  createPlatePlugin: () => ({
    extend: () => ({}),
  }),
  PlateElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useEditorRef: () => ({
    api: {
      findPath: () => [0],
    },
    tf: {
      setNodes: vi.fn(),
    },
  }),
}));

vi.mock("@/modules/template/presentation/components/logic-block-editor-dialog", () => ({
  LogicBlockEditorDialog: () => null,
}));

vi.mock("@/modules/template/presentation/components/variable-selector", () => ({
  VariableSelector: ({
    onSelect,
  }: {
    onSelect: (node: {
      path: string;
      displayName: string;
      fieldType: "TEXT";
      collectionId: string;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          path: "cliente.nombre",
          displayName: "Nombre",
          fieldType: "TEXT",
          collectionId: "collection-1",
        })
      }
    >
      Insertar variable
    </button>
  ),
}));

function Wrapper() {
  const [value, setValue] = React.useState("Resume ");

  return (
    <TemplateAIInlinePromptEditor
      value={value}
      onChange={setValue}
      catalogNodes={[]}
      catalogLoading={false}
    />
  );
}

describe("TemplateAIInlinePromptEditor", () => {
  it("inserts root and variable tokens inline", () => {
    render(<Wrapper />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);

    fireEvent.click(screen.getByRole("button", { name: "Usar Registro" }));
    expect(textarea.value).toContain("{{root}}");

    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    fireEvent.click(screen.getByRole("button", { name: "Insertar variable" }));

    expect(textarea.value).toContain("{{cliente.nombre}}");
  });

  it("auto-grows the textarea based on scrollHeight", () => {
    render(
      <TemplateAIInlinePromptEditor
        value="Prompt inicial"
        onChange={() => {}}
        catalogNodes={[]}
        catalogLoading={false}
      />,
    );

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", {
      configurable: true,
      value: 180,
    });

    fireEvent.change(textarea, { target: { value: "Prompt mucho mas largo" } });

    expect(textarea.style.height).toBe("180px");
  });
});
