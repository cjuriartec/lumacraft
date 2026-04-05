"use client";

import * as React from "react";

import { TemplateVariableCatalogNode } from "../types/template-variable-catalog";

interface TemplateVariableCatalogContextValue {
  nodes: TemplateVariableCatalogNode[];
  loading: boolean;
  error: string | null;
}

const TemplateVariableCatalogContext = React.createContext<TemplateVariableCatalogContextValue>({
  nodes: [],
  loading: false,
  error: null,
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
