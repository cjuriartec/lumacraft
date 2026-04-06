ALTER TABLE public.account_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_ai_settings_select_policy" ON public.account_ai_settings;
CREATE POLICY "account_ai_settings_select_policy"
ON public.account_ai_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.account_members am
    WHERE am.account_id = account_ai_settings.account_id
      AND am.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = account_ai_settings.account_id
      AND a.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "account_ai_settings_insert_policy" ON public.account_ai_settings;
CREATE POLICY "account_ai_settings_insert_policy"
ON public.account_ai_settings FOR INSERT
WITH CHECK (
  public.user_is_account_admin(account_id)
);

DROP POLICY IF EXISTS "account_ai_settings_update_policy" ON public.account_ai_settings;
CREATE POLICY "account_ai_settings_update_policy"
ON public.account_ai_settings FOR UPDATE
USING (
  public.user_is_account_admin(account_id)
)
WITH CHECK (
  public.user_is_account_admin(account_id)
);

DROP POLICY IF EXISTS "account_ai_settings_delete_policy" ON public.account_ai_settings;
CREATE POLICY "account_ai_settings_delete_policy"
ON public.account_ai_settings FOR DELETE
USING (
  public.user_is_account_admin(account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_ai_settings TO authenticated;
GRANT ALL ON public.account_ai_settings TO service_role;
