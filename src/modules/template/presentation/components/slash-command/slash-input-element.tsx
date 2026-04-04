"use client";

import {
  Braces,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Pilcrow,
  Table,
} from "lucide-react";
import { KEYS, type TComboboxInputElement } from "platejs";
import { type PlateEditor, PlateElement, type PlateElementProps } from "platejs/react";
import * as React from "react";

import { insertBlock } from "@/shared/presentation/components/editor/transforms";
import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "@/shared/presentation/components/ui/inline-combobox";

type Group = {
  group: string;
  items: {
    icon: React.ReactNode;
    value: string;
    onSelect: (editor: PlateEditor, value: string) => void;
    className?: string;
    focusEditor?: boolean;
    keywords?: string[];
    label?: string;
  }[];
};

const groups: Group[] = [
  {
    group: "Bloques básicos",
    items: [
      {
        icon: <Pilcrow size={16} />,
        keywords: ["paragraph", "p", "texto"],
        label: "Texto",
        value: KEYS.p,
      },
      {
        icon: <Heading1 size={16} />,
        keywords: ["title", "h1", "titulo 1"],
        label: "Título 1",
        value: KEYS.h1,
      },
      {
        icon: <Heading2 size={16} />,
        keywords: ["subtitle", "h2", "titulo 2"],
        label: "Título 2",
        value: KEYS.h2,
      },
      {
        icon: <Heading3 size={16} />,
        keywords: ["subtitle", "h3", "titulo 3"],
        label: "Título 3",
        value: KEYS.h3,
      },
      {
        icon: <List size={16} />,
        keywords: ["unordered", "ul", "-", "lista"],
        label: "Lista con viñetas",
        value: KEYS.ul,
      },
      {
        icon: <ListOrdered size={16} />,
        keywords: ["ordered", "ol", "1", "lista"],
        label: "Lista numerada",
        value: KEYS.ol,
      },
      {
        icon: <Table size={16} />,
        keywords: ["tabla", "grid"],
        label: "Tabla",
        value: KEYS.table,
      },
      {
        icon: <ImageIcon size={16} />,
        keywords: ["imagen", "media", "foto"],
        label: "Imagen",
        value: KEYS.img,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor, value) => {
        insertBlock(editor, value, { upsert: true });
      },
    })),
  },
  {
    group: "Lumacraft",
    items: [
      {
        focusEditor: false,
        icon: <Braces size={16} className="text-primary" />,
        keywords: ["variable", "campo", "dinamico", "braces"],
        label: "Variable",
        value: "variable",
        onSelect: (editor) => {
          // Delay opening to the next frame so slash cleanup doesn't close it immediately.
          window.requestAnimationFrame(() => {
            const event = new CustomEvent("open-variable-selector", {
              detail: { editor },
            });
            window.dispatchEvent(event);
          });
        },
      },
    ],
  },
];

export function SlashInputElement(props: PlateElementProps<TComboboxInputElement>) {
  const { editor, element } = props;

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox element={element} trigger="/">
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>No hay resultados</InlineComboboxEmpty>

          {groups.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(({ focusEditor, icon, keywords, label, value, onSelect }) => (
                <InlineComboboxItem
                  key={value}
                  value={value}
                  onClick={() => onSelect(editor, value)}
                  label={label}
                  focusEditor={focusEditor}
                  group={group}
                  keywords={keywords}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground/5 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {icon}
                    </div>
                    <span>{label ?? value}</span>
                  </div>
                </InlineComboboxItem>
              ))}
            </InlineComboboxGroup>
          ))}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  );
}
