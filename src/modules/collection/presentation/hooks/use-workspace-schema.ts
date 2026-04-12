"use client";

import { useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { CollectionUseCaseFactory } from "../../application/collection-use-case.factory";
import { Collection } from "../../domain/entities/collection.entity";
import { Field } from "../../domain/entities/field.entity";

export function useWorkspaceSchema() {
  const { currentWorkspace } = useWorkspace();
  const { supabase } = useSupabase();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);
  const schemaUseCase = useMemo(() => factory.getWorkspaceSchema(), [factory]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!currentWorkspace) {
        setCollections([]);
        setFields([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await schemaUseCase.execute(currentWorkspace.id);

      if (!ignore && res.ok) {
        setCollections(res.value.collections);
        setFields(res.value.fields);
        setLoading(false);
      }
    };

    void load();
    return () => {
      ignore = true;
    };
  }, [currentWorkspace, schemaUseCase]);

  return {
    collections,
    fields,
    loading,
  };
}
