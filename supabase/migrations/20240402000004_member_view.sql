-- ============================================
-- Sprint 4: Enriched Members View (Senior Choice - Final)
-- ============================================

-- 1. Ensure Foreign Key for integrity
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_account_members_user_id') THEN
    ALTER TABLE public.account_members 
    ADD CONSTRAINT fk_account_members_user_id 
    FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Create the Enriched Function (Security Definer)
CREATE OR REPLACE FUNCTION public.fetch_enriched_members()
RETURNS TABLE (
    id UUID,
    account_id UUID,
    user_id UUID,
    role_id UUID,
    joined_at TIMESTAMP WITH TIME ZONE,
    user_email TEXT,
    user_name TEXT,
    user_avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.id,
        am.account_id,
        am.user_id,
        am.role_id,
        am.joined_at,
        u.email::TEXT as user_email,
        COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Usuario')::TEXT as user_name,
        (u.raw_user_meta_data->>'avatar_url')::TEXT as user_avatar_url
    FROM public.account_members am
    LEFT JOIN auth.users u ON am.user_id = u.id
    -- Multi-tenant isolation: user can only see members of their own accounts
    WHERE EXISTS (
        SELECT 1 FROM public.account_members m
        WHERE m.account_id = am.account_id
        AND m.user_id = auth.uid()
    );
END;
$$;

-- 3. Expose as a View (Security Invoker)
CREATE OR REPLACE VIEW public.workspace_members_view 
WITH (security_invoker = true)
AS
SELECT * FROM public.fetch_enriched_members();

-- 4. Permissions
GRANT SELECT ON public.workspace_members_view TO authenticated;

-- Comment
COMMENT ON VIEW public.workspace_members_view IS 'Flat view of workspace members with user details joined from auth.users.';
