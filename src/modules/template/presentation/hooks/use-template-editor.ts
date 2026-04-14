"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Result } from "@/shared/domain/result";
import { DomainError, fail } from "@/shared/domain/result";
import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { TemplateUseCaseFactory } from "../../application/template-use-case.factory";
import type { Template } from "../../domain/entities/template.entity";
import type { PdfPageConfig } from "../../domain/types/pdf-page-config";
import type { TemplateBlocks } from "../../domain/types/template-blocks";

export function useTemplateEditor(templateId: string) {
  const { supabase } = useSupabase();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRequestIdRef = useRef(0);
  const isMountedRef = useRef(true);

  const factory = useMemo(() => TemplateUseCaseFactory.create(supabase), [supabase]);
  const getUseCase = useMemo(() => factory.getTemplate(), [factory]);
  const updateUseCase = useMemo(() => factory.updateTemplate(), [factory]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      const res = await getUseCase.execute(templateId);
      if (!ignore && res.ok) {
        setTemplate(res.value);
      }
      if (!ignore) {
        setLoading(false);
      }
    };

    void load();

    return () => {
      ignore = true;
    };
  }, [templateId, getUseCase]);

  const saveBlocks = useCallback(
    async (blocks: TemplateBlocks) => {
      if (!template) return;

      const requestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = requestId;
      if (isMountedRef.current) setSaveStatus("saving");

      const res = await updateUseCase.execute({
        id: template.id,
        accountId: template.accountId,
        name: template.name,
        description: template.description,
        collectionId: template.collectionId,
        blocks,
      });

      if (!isMountedRef.current) return;
      if (requestId !== saveRequestIdRef.current) return;

      if (res.ok) {
        setTemplate(res.value);
        setSaveStatus("saved");

        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current);
        }

        statusTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus("idle");
          }
        }, 2000);
      } else {
        setSaveStatus("error");
      }
    },
    [template, updateUseCase],
  );

  const savePageConfig = useCallback(
    async (pageConfig: PdfPageConfig | null) => {
      if (!template) return;

      const requestId = saveRequestIdRef.current + 1;
      saveRequestIdRef.current = requestId;
      if (isMountedRef.current) setSaveStatus("saving");

      const res = await updateUseCase.execute({
        id: template.id,
        accountId: template.accountId,
        name: template.name,
        description: template.description,
        collectionId: template.collectionId,
        blocks: template.blocks,
        pageConfig,
      });

      if (!isMountedRef.current) return;
      if (requestId !== saveRequestIdRef.current) return;

      if (res.ok) {
        setTemplate(res.value);
        setSaveStatus("saved");
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setSaveStatus("idle");
        }, 2000);
      } else {
        setSaveStatus("error");
      }
    },
    [template, updateUseCase],
  );

  const pageConfigSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePageConfigChange = useCallback(
    (pageConfig: PdfPageConfig | null) => {
      if (pageConfigSaveTimeoutRef.current) clearTimeout(pageConfigSaveTimeoutRef.current);
      pageConfigSaveTimeoutRef.current = setTimeout(() => {
        void savePageConfig(pageConfig);
      }, 1500);
    },
    [savePageConfig],
  );

  const handleBlocksChange = useCallback(
    (blocks: TemplateBlocks) => {
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
    async (name: string): Promise<Result<Template>> => {
      if (!template) {
        return fail(new DomainError("Template not loaded", "TEMPLATE_NOT_LOADED"));
      }

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
    handlePageConfigChange,
    updateName,
  };
}
