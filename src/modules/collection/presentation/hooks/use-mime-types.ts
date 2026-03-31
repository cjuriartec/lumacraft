'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/shared/presentation/providers/supabase-provider'

export type MimeType = {
  id: string
  label: string
  value: string
  extension?: string
  category?: string
}

export function useMimeTypes() {
  const { supabase } = useSupabase()
  const [mimeTypes, setMimeTypes] = useState<MimeType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMimeTypes() {
      try {
        const { data, error: fetchError } = await supabase
          .from('mime_types')
          .select('*')
          .order('label', { ascending: true })

        if (fetchError) throw fetchError
        setMimeTypes(data || [])
      } catch (e: any) {
        console.error('Error fetching mime types:', e)
        setError(e.message || 'No se pudieron cargar los tipos MIME.')
      } finally {
        setLoading(false)
      }
    }

    void fetchMimeTypes()
  }, [supabase])

  return { mimeTypes, loading, error }
}
