-- Migration: Increase default max tokens for AI text generations
-- Description: Changes the restrictive 300 tokens default to 25000 to prevent AI documents from cutting off.

-- 1. Modify the default value for future workspaces
ALTER TABLE public.account_ai_settings 
  ALTER COLUMN default_max_tokens SET DEFAULT 25000;

-- 2. Retroactively update existing workspaces that were stuck with the 300 tokens default
UPDATE public.account_ai_settings
  SET default_max_tokens = 25000
  WHERE default_max_tokens = 300;
