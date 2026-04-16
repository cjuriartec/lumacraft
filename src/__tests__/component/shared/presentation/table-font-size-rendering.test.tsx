"use client";

import { render, screen } from "@testing-library/react";
import { Plate, usePlateEditor } from "platejs/react";
import * as React from "react";
import { describe, expect, it } from "vitest";

import { ExtendedNodesKit } from "@/shared/presentation/components/editor/plugins/extended-nodes-kit";
import { Editor, EditorContainer } from "@/shared/presentation/components/ui/editor";
import { TABLE_DEFAULT_COLUMN_WIDTH } from "@/shared/presentation/components/ui/table-node";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TestEditor({ value }: { value: any[] }) {
  const editor = usePlateEditor({
    id: "table-font-size-test",
    value,
    plugins: [...ExtendedNodesKit],
  });

  return (
    <Plate editor={editor} readOnly>
      <EditorContainer>
        <Editor readOnly variant="a4" />
      </EditorContainer>
    </Plate>
  );
}

function getFontSizedAncestor(text: string) {
  const element = screen.getByText(text);
  return element.closest("span[style], p[style], div[style]");
}

describe("table font size rendering", () => {
  it("uses a narrower default column width for compact tables", () => {
    expect(TABLE_DEFAULT_COLUMN_WIDTH).toBe(56);
  });

  it("keeps 11pt text both outside and inside table cells", () => {
    render(
      <TestEditor
        value={[
          {
            type: "p",
            children: [{ text: "Fuera de tabla", fontSize: "11pt", fontFamily: "roboto" }],
          },
          {
            type: "table",
            children: [
              {
                type: "tr",
                children: [
                  {
                    type: "td",
                    children: [
                      {
                        type: "p",
                        fontSize: "11pt",
                        fontFamily: "roboto",
                        children: [
                          { text: "Dentro de tabla", fontSize: "11pt", fontFamily: "roboto" },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ]}
      />,
    );

    const outside = getFontSizedAncestor("Fuera de tabla");
    const inside = getFontSizedAncestor("Dentro de tabla");

    expect(outside).not.toBeNull();
    expect(inside).not.toBeNull();
    expect(outside).toHaveStyle({ fontSize: "11pt" });
    expect(inside).toHaveStyle({ fontSize: "11pt" });
  });
});
