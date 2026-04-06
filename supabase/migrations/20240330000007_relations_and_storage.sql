-- ============================================
-- Sprint 3: Relations + Storage policies
-- ============================================

-- RELATIONS GRAPH TABLE
CREATE TABLE IF NOT EXISTS public.record_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES public.fields(id) ON DELETE CASCADE,
    source_record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
    target_record_id UUID NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(field_id, source_record_id, target_record_id)
);

CREATE INDEX IF NOT EXISTS idx_record_relations_account ON public.record_relations(account_id);
CREATE INDEX IF NOT EXISTS idx_record_relations_field ON public.record_relations(field_id);
CREATE INDEX IF NOT EXISTS idx_record_relations_source ON public.record_relations(source_record_id);
CREATE INDEX IF NOT EXISTS idx_record_relations_target ON public.record_relations(target_record_id);

ALTER TABLE public.record_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view record relations of their accounts"
ON public.record_relations FOR SELECT
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can create record relations of their accounts"
ON public.record_relations FOR INSERT
WITH CHECK (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can update record relations of their accounts"
ON public.record_relations FOR UPDATE
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can delete record relations of their accounts"
ON public.record_relations FOR DELETE
USING (account_id IN (SELECT public.get_user_workspace_ids()));

-- STORAGE BUCKET FOR FILE FIELDS
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'record_files',
    'record_files',
    false,
    10485760,
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read files from their workspaces"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'record_files'
  AND split_part(name, '/', 1) IN (SELECT account_id::text FROM public.get_user_workspace_ids())
);

CREATE POLICY "Users can upload files to their workspaces"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'record_files'
  AND split_part(name, '/', 1) IN (SELECT account_id::text FROM public.get_user_workspace_ids())
);

CREATE POLICY "Users can update files from their workspaces"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'record_files'
  AND split_part(name, '/', 1) IN (SELECT account_id::text FROM public.get_user_workspace_ids())
)
WITH CHECK (
  bucket_id = 'record_files'
  AND split_part(name, '/', 1) IN (SELECT account_id::text FROM public.get_user_workspace_ids())
);

CREATE POLICY "Users can delete files from their workspaces"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'record_files'
  AND split_part(name, '/', 1) IN (SELECT account_id::text FROM public.get_user_workspace_ids())
);
