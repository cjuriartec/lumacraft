-- Migration: add page_config column to templates table
-- Stores PDF header/footer configuration as JSONB (nullable, backward-compatible)

ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS page_config JSONB DEFAULT NULL;

COMMENT ON COLUMN public.templates.page_config IS
  'JSON configuration for PDF header/footer sections. NULL means no custom header/footer.';
