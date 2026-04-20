-- Redefine fetch_enriched_members to prioritize custom profile data from public.user_profiles
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
        COALESCE(up.full_name, u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Usuario')::TEXT as user_name,
        COALESCE(up.avatar_url, (u.raw_user_meta_data->>'avatar_url')::TEXT) as user_avatar_url
    FROM public.account_members am
    LEFT JOIN auth.users u ON am.user_id = u.id
    LEFT JOIN public.user_profiles up ON am.user_id = up.id
    -- Multi-tenant isolation: user can only see members of their own accounts
    WHERE EXISTS (
        SELECT 1 FROM public.account_members m
        WHERE m.account_id = am.account_id
        AND m.user_id = auth.uid()
    );
END;
$$;

-- Note: The view workspace_members_view automatically picks up the function changes
