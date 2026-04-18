"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { CollectionUseCaseFactory } from "../../application/collection-use-case.factory";
import { CollectionSettings } from "../../domain/entities/collection.entity";
import { Collection } from "../../domain/entities/collection.entity";

export function useCollections() {
  const { currentWorkspace } = useWorkspace();
  const { supabase } = useSupabase();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);
  const listUseCase = useMemo(() => factory.listCollections(), [factory]);
  const createUseCase = useMemo(() => factory.createCollection(), [factory]);
  const deleteUseCase = useMemo(() => factory.deleteCollection(), [factory]);
  const updateUseCase = useMemo(() => factory.updateCollection(), [factory]);

  const fetchCollections = useCallback(async () => {
    if (!currentWorkspace) {
      setCollections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listUseCase.execute(currentWorkspace.id);
    if (res.ok) {
      setCollections(res.value);
    }
    setLoading(false);
  }, [currentWorkspace, listUseCase]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!currentWorkspace) {
        if (!ignore) {
          setCollections([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const res = await listUseCase.execute(currentWorkspace.id);
      if (!ignore) {
        if (res.ok) setCollections(res.value);
        setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [currentWorkspace, listUseCase]);

  const createCollection = async (params: {
    name: string;
    displayName?: string;
    description?: string;
    icon?: string;
  }) => {
    if (!currentWorkspace) return;
    const res = await createUseCase.execute({
      accountId: currentWorkspace.id,
      ...params,
    });
    if (res.ok) {
      await fetchCollections();
    }
    return res;
  };

  const deleteCollection = async (id: string) => {
    const res = await deleteUseCase.execute(id);
    if (res.ok) {
      await fetchCollections();
    }
    return res;
  };

  const updateCollection = async (params: {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    icon?: string;
    primaryFieldName?: string | null;
    settings?: CollectionSettings;
  }) => {
    if (!currentWorkspace) return;
    const res = await updateUseCase.execute({
      accountId: currentWorkspace.id,
      ...params,
    });
    if (res.ok) {
      await fetchCollections();
    }
    return res;
  };

  return {
    collections,
    loading,
    createCollection,
    updateCollection,
    deleteCollection,
    refresh: fetchCollections,
  };
}
