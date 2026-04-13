"use client";

import { useMemo } from "react";

import { useSupabase } from "@/shared/presentation/providers/supabase-provider";

import { CollectionUseCaseFactory } from "../../application/collection-use-case.factory";

export function useStorage() {
  const { supabase } = useSupabase();

  const factory = useMemo(() => CollectionUseCaseFactory.create(supabase), [supabase]);

  const uploadUseCase = useMemo(() => factory.uploadFile(), [factory]);
  const downloadUseCase = useMemo(() => factory.downloadFile(), [factory]);
  const getPublicUrlUseCase = useMemo(() => factory.getPublicUrl(), [factory]);
  const deleteUseCase = useMemo(() => factory.deleteFile(), [factory]);

  const uploadFile = async (bucket: string, path: string, file: File) => {
    return uploadUseCase.execute(bucket, path, file);
  };

  const downloadFile = async (bucket: string, path: string) => {
    return downloadUseCase.execute(bucket, path);
  };

  const getPublicUrl = (bucket: string, path: string) => {
    return getPublicUrlUseCase.execute(bucket, path);
  };

  const deleteFiles = async (bucket: string, paths: string[]) => {
    return deleteUseCase.execute(bucket, paths);
  };

  return {
    uploadFile,
    downloadFile,
    getPublicUrl,
    deleteFiles,
  };
}
