"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useWorkspace } from "@/modules/workspace/presentation/providers/workspace-provider";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { TemplateUseCaseFactory } from "../../application/template-use-case.factory";
import { Template } from "../../domain/entities/template.entity";

export function useTemplates() {
  const { currentWorkspace } = useWorkspace();
  const { supabase } = useSupabase();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const factory = useMemo(() => TemplateUseCaseFactory.create(supabase), [supabase]);
  const listUseCase = useMemo(() => factory.listTemplates(), [factory]);
  const createUseCase = useMemo(() => factory.createTemplate(), [factory]);
  const deleteUseCase = useMemo(() => factory.deleteTemplate(), [factory]);
  const updateUseCase = useMemo(() => factory.updateTemplate(), [factory]);

  const fetchTemplates = useCallback(async () => {
    if (!currentWorkspace) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await listUseCase.execute(currentWorkspace.id);
    if (res.ok) {
      setTemplates(res.value);
    }
    setLoading(false);
  }, [currentWorkspace, listUseCase]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!currentWorkspace) {
        if (!ignore) {
          setTemplates([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      const res = await listUseCase.execute(currentWorkspace.id);
      if (!ignore) {
        if (res.ok) setTemplates(res.value);
        setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [currentWorkspace, listUseCase]);

  const createTemplate = async (params: {
    name: string;
    description?: string;
    collectionId?: string | null;
  }) => {
    if (!currentWorkspace) return;
    const res = await createUseCase.execute({
      accountId: currentWorkspace.id,
      ...params,
    });
    if (res.ok) {
      await fetchTemplates();
    }
    return res;
  };

  const deleteTemplate = async (id: string) => {
    const res = await deleteUseCase.execute(id);
    if (res.ok) {
      await fetchTemplates();
    }
    return res;
  };

  const updateTemplate = async (params: {
    id: string;
    name: string;
    description?: string;
    collectionId?: string | null;
    blocks?: unknown[];
  }) => {
    if (!currentWorkspace) return;
    const res = await updateUseCase.execute({
      accountId: currentWorkspace.id,
      ...params,
    });
    if (res.ok) {
      await fetchTemplates();
    }
    return res;
  };

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refresh: fetchTemplates,
  };
}
