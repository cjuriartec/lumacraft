"use client";

import { useCallback, useMemo } from "react";

import type { Result } from "@/shared/domain/result";

import { UploadFileUseCase } from "../../application/upload-file.use-case";
import { SupabaseStorageRepository } from "../../infrastructure/repositories/supabase-storage.repository";
import { useSupabase } from "../providers/supabase-provider";

/**
 * Hook: useUploadFile
 *
 * Presentation-layer hook that wires the UploadFileUseCase
 * with the SupabaseStorageRepository adapter, following
 * the same pattern as useTemplateEditor.
 */
export function useUploadFile() {
  const { supabase } = useSupabase();

  const useCase = useMemo(() => {
    const repository = new SupabaseStorageRepository(supabase);
    return new UploadFileUseCase(repository);
  }, [supabase]);

  const uploadFile = useCallback(
    async (
      file: File,
      bucket = "template-media",
      folder?: string,
    ): Promise<Result<{ url: string }>> => {
      return useCase.execute({ bucket, file, folder });
    },
    [useCase],
  );

  return { uploadFile };
}
