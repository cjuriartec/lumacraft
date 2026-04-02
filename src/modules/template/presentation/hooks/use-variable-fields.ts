"use client";

import { useEffect, useMemo, useState } from "react";

import { CollectionUseCaseFactory } from "@/modules/collection/application/collection-use-case.factory";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

export interface VariableNode {
  path: string; // "proyecto.nombre"
  displayName: string; // "Nombre del Proyecto"
  fieldType: string; // "TEXT", "NUMBER", etc.
  collectionId: string; // UUID de la colección de origen
  children?: VariableNode[]; // Sub-campos para RELATION
}

export function useVariableFields(collectionId?: string | null) {
  const { supabase } = useSupabase();
  const [nodes, setNodes] = useState<VariableNode[]>([]);
  const [loading, setLoading] = useState(false);

  const collectionFactory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);
  const listFieldsUseCase = useMemo(() => collectionFactory.listFields(), [collectionFactory]);

  useEffect(() => {
    const listFields = listFieldsUseCase;

    const resolveNodes = async (
      targetCollectionId: string,
      currentPath: string = "",
      depth: number = 0,
    ): Promise<VariableNode[]> => {
      if (depth >= 5) return [];

      const fieldsRes = await listFields.execute(targetCollectionId);
      if (!fieldsRes.ok) return [];

      const fieldNodes: VariableNode[] = [];

      for (const field of fieldsRes.value) {
        const fieldPath = currentPath ? `${currentPath}.${field.name}` : field.name;

        const node: VariableNode = {
          path: fieldPath,
          displayName: field.displayName || field.name,
          fieldType: field.fieldType.value,
          collectionId: targetCollectionId,
        };

        if (field.fieldType.value === "RELATION" && field.config?.value?.targetCollectionId) {
          const children = await resolveNodes(
            field.config.value.targetCollectionId as string,
            fieldPath,
            depth + 1,
          );
          if (children.length > 0) {
            node.children = children;
          }
        }

        fieldNodes.push(node);
      }

      return fieldNodes;
    };

    let ignore = false;
    const load = async () => {
      if (!collectionId) {
        setNodes([]);
        return;
      }

      setLoading(true);
      const resolvedNodes = await resolveNodes(collectionId);
      if (!ignore) {
        setNodes(resolvedNodes);
        setLoading(false);
      }
    };

    load();

    return () => {
      ignore = true;
    };
  }, [collectionId, listFieldsUseCase]);

  return {
    nodes,
    loading,
  };
}
