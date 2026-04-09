-- Migration: Add fallback AI settings to account_ai_settings
-- Created: 2026-04-09
-- Description: Adds fallback_provider, fallback_model, and enable_fallback to allow dynamic provider switching.

ALTER TABLE public.account_ai_settings
ADD COLUMN IF NOT EXISTS enable_fallback BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fallback_provider ai_provider_enum NOT NULL DEFAULT 'OPENAI',
ADD COLUMN IF NOT EXISTS fallback_model TEXT NOT NULL DEFAULT 'gpt-5.4-mini';

COMMENT ON COLUMN public.account_ai_settings.enable_fallback IS 'Enables automatic retry with fallback_provider if primary provider fails.';
COMMENT ON COLUMN public.account_ai_settings.fallback_provider IS 'The secondary provider to use if default_provider fails.';
COMMENT ON COLUMN public.account_ai_settings.fallback_model IS 'The model to use when falling back to the secondary provider.';
