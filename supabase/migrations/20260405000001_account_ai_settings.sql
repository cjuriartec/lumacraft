CREATE TABLE IF NOT EXISTS public.account_ai_settings (
  account_id UUID PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  default_provider ai_provider_enum NOT NULL DEFAULT 'GEMINI',
  default_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  default_temperature NUMERIC(3,2) NOT NULL DEFAULT 0.20 CHECK (default_temperature >= 0 AND default_temperature <= 2),
  default_max_tokens INTEGER NOT NULL DEFAULT 300 CHECK (default_max_tokens > 0),
  request_timeout_ms INTEGER NOT NULL DEFAULT 25000 CHECK (request_timeout_ms >= 1000),
  feature_template_ai BOOLEAN NOT NULL DEFAULT true,
  feature_template_logic BOOLEAN NOT NULL DEFAULT true,
  template_preview_timeout_ms INTEGER NOT NULL DEFAULT 45000 CHECK (template_preview_timeout_ms >= 5000),
  template_preview_max_ai_blocks INTEGER NOT NULL DEFAULT 3 CHECK (template_preview_max_ai_blocks >= 1),
  system_prompt TEXT,
  provider_options JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_secrets JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_ai_settings_default_provider
  ON public.account_ai_settings(default_provider);

ALTER TABLE public.account_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.ensure_account_ai_settings_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.account_ai_settings (account_id)
  VALUES (NEW.id)
  ON CONFLICT (account_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accounts_insert_account_ai_settings ON public.accounts;

CREATE TRIGGER trg_accounts_insert_account_ai_settings
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_account_ai_settings_row();

INSERT INTO public.account_ai_settings (account_id)
SELECT a.id
FROM public.accounts a
LEFT JOIN public.account_ai_settings s ON s.account_id = a.id
WHERE s.account_id IS NULL;

GRANT ALL ON public.account_ai_settings TO service_role;

COMMENT ON TABLE public.account_ai_settings IS
'Server-managed AI configuration per workspace/account. Secrets remain encrypted in provider_secrets.';
