"use client";

import { render, screen } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { ParagraphElement } from "@/shared/presentation/components/ui/paragraph-node";
import { ParagraphElementStatic } from "@/shared/presentation/components/ui/paragraph-node-static";

vi.mock("platejs/react", () => ({
  PlateElement: ({
    children,
    style,
    className,
  }: {
    children: ReactNode;
    style?: CSSProperties;
    className?: string;
  }) => (
    <p data-testid="plate-paragraph" style={style} className={className}>
      {children}
    </p>
  ),
}));

vi.mock("platejs/static", () => ({
  SlateElement: ({
    children,
    style,
    className,
  }: {
    children: ReactNode;
    style?: CSSProperties;
    className?: string;
  }) => (
    <p data-testid="static-paragraph" style={style} className={className}>
      {children}
    </p>
  ),
}));

describe("paragraph spacing rendering", () => {
  const attributes = {
    "data-slate-node": "element" as const,
    ref: vi.fn(),
  };
  const editorProps = {
    api: {},
    editor: null,
    plugin: {},
    setOptions: vi.fn(),
    tf: {},
    type: "p",
    getOptions: vi.fn(),
    options: {},
  } as const;
  const pluginContextProps = editorProps as unknown as Record<string, unknown>;

  it("applies persisted spaceBefore and spaceAfter in the editor paragraph", () => {
    render(
      React.createElement(
        ParagraphElement as never,
        {
          ...pluginContextProps,
          attributes,
          element: { type: "p", spaceBefore: 8, spaceAfter: 12, children: [] },
        },
        "Contenido",
      ),
    );

    expect(screen.getByTestId("plate-paragraph")).toHaveStyle({
      marginTop: "8px",
      marginBottom: "12px",
    });
  });

  it("keeps default paragraph spacing untouched when no custom spacing exists", () => {
    render(
      React.createElement(
        ParagraphElement as never,
        {
          ...pluginContextProps,
          attributes,
          element: { type: "p", children: [] },
        },
        "Sin espaciado",
      ),
    );

    expect(screen.getByTestId("plate-paragraph")).toHaveStyle({
      marginTop: "0px",
      marginBottom: "8px",
    });
  });

  it("applies the same spacing in the static paragraph renderer", () => {
    render(
      React.createElement(
        ParagraphElementStatic as never,
        {
          ...pluginContextProps,
          attributes,
          element: { type: "p", spaceBefore: 6, spaceAfter: 10, children: [] },
        },
        "Estático",
      ),
    );

    expect(screen.getByTestId("static-paragraph")).toHaveStyle({
      marginTop: "6px",
      marginBottom: "10px",
    });
  });
});
