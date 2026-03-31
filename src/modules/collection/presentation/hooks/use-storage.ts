'use client'

import { useMemo } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'
import { SupabaseStorageRepository } from '../../infrastructure/repositories/supabase-storage.repository'
import { DownloadFileUseCase } from '../../application/use-cases/download-file.use-case'
import { UploadFileUseCase, DeleteFileUseCase } from '../../application/use-cases/file-mgmt.use-case'

export function useStorage() {
  const { supabase } = useSupabase()

  const repository = useMemo(() => new SupabaseStorageRepository(supabase), [supabase])

  const uploadUseCase = useMemo(() => new UploadFileUseCase(repository), [repository])
  const downloadUseCase = useMemo(() => new DownloadFileUseCase(repository), [repository])
  const deleteUseCase = useMemo(() => new DeleteFileUseCase(repository), [repository])

  const uploadFile = async (bucket: string, path: string, file: File) => {
    return uploadUseCase.execute(bucket, path, file)
  }

  const downloadFile = async (bucket: string, path: string) => {
    return downloadUseCase.execute(bucket, path)
  }

  const deleteFiles = async (bucket: string, paths: string[]) => {
    return deleteUseCase.execute(bucket, paths)
  }

  return {
    uploadFile,
    downloadFile,
    deleteFiles
  }
}
