"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { TemplateUseCaseFactory } from "../../application/template-use-case.factory";
import { Template } from "../../domain/entities/template.entity";

export function useTemplateEditor(templateId: string) {
  const { supabase } = useSupabase();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const factory = useMemo(() => TemplateUseCaseFactory.create(supabase), [supabase]);
  const getUseCase = useMemo(() => factory.getTemplate(), [factory]);
  const updateUseCase = useMemo(() => factory.updateTemplate(), [factory]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await getUseCase.execute(templateId);
      if (res.ok) {
        setTemplate(res.value);
      }
      setLoading(false);
    };
    load();
  }, [templateId, getUseCase]);

  const saveBlocks = useCallback(
    async (blocks: unknown[]) => {
      if (!template) return;
      setSaveStatus("saving");
      const res = await updateUseCase.execute({
        id: template.id,
        accountId: template.accountId,
        name: template.name,
        description: template.description,
        collectionId: template.collectionId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        blocks: blocks as any[],
      });

      if (res.ok) {
        setTemplate(res.value);
        setSaveStatus("saved");
        // After showing "saved" for a while, go back to idle
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    },
    [template, updateUseCase],
  );

  const handleBlocksChange = useCallback(
    (blocks: unknown[]) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      setSaveStatus("idle");
      saveTimeoutRef.current = setTimeout(() => {
        saveBlocks(blocks);
      }, 1500); // 1.5s debounce as planned
    },
    [saveBlocks],
  );

  const updateName = useCallback(
    async (name: string) => {
      if (!template) return;
      const res = await updateUseCase.execute({
        id: template.id,
        accountId: template.accountId,
        name,
        description: template.description,
        collectionId: template.collectionId,
        blocks: template.blocks,
      });
      if (res.ok) {
        setTemplate(res.value);
      }
      return res;
    },
    [template, updateUseCase],
  );

  return {
    template,
    loading,
    saveStatus,
    handleBlocksChange,
    updateName,
  };
}
