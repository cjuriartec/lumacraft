-- ============================================
-- Add description column to fields table
-- ============================================

ALTER TABLE public.fields
ADD COLUMN description TEXT;

COMMENT ON COLUMN public.fields.description IS 'Human-readable description of the field purpose and usage';
