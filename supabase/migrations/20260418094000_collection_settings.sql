ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.collections.settings IS
  'Workspace-wide collection settings such as shared table layout preferences.';
