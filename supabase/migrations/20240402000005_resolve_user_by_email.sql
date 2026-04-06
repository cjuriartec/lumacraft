-- ============================================
-- Sprint 4: Resolve User UUID by Email (RPC)
-- ============================================
-- This function allows an authenticated user to resolve a
-- user's UUID from their email address.
-- It exposes ONLY the UUID, no other sensitive data.
-- SECURITY DEFINER is required to access auth.users.
-- ============================================

CREATE OR REPLACE FUNCTION public.resolve_user_by_email(lookup_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Only allow authenticated users to call this function
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id INTO found_user_id
  FROM auth.users
  WHERE email = LOWER(TRIM(lookup_email))
  LIMIT 1;

  RETURN found_user_id; -- Returns NULL if not found
END;
$$;

-- Revoke from public/anon, grant only to authenticated users
REVOKE ALL ON FUNCTION public.resolve_user_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_user_by_email(TEXT) TO authenticated;
