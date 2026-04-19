"use client";

import * as React from "react";

import {
  TemplateCollectionContext,
  TemplateVariableCatalogNode,
} from "../types/template-variable-catalog";

interface TemplateVariableCatalogContextValue {
  nodes: TemplateVariableCatalogNode[];
  loading: boolean;
  error: string | null;
  collectionContext: TemplateCollectionContext | null;
  activate: () => void;
}

const TemplateVariableCatalogContext = React.createContext<TemplateVariableCatalogContextValue>({
  nodes: [],
  loading: false,
  error: null,
  collectionContext: null,
  activate: () => undefined,
});

interface TemplateVariableCatalogProviderProps {
  value: TemplateVariableCatalogContextValue;
  children: React.ReactNode;
}

export function TemplateVariableCatalogProvider({
  value,
  children,
}: TemplateVariableCatalogProviderProps) {
  return (
    <TemplateVariableCatalogContext.Provider value={value}>
      {children}
    </TemplateVariableCatalogContext.Provider>
  );
}

export function useTemplateVariableCatalog() {
  return React.useContext(TemplateVariableCatalogContext);
}
