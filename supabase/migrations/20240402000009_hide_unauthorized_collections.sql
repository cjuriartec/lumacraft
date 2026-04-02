-- ============================================
-- Sprint 4: Strictly Hide Collections without Read Permission
-- ============================================

-- Function to evaluate collection visibility without recursing into 'collections'
CREATE OR REPLACE FUNCTION public.user_can_read_collection_metadata(p_account_id UUID, p_collection_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- 1. Is Admin? (Owners and Superadmins return true here)
  IF public.user_is_account_admin(p_account_id) THEN
    RETURN true;
  END IF;

  -- 2. Find user's exact role in this workspace
  SELECT role_id INTO v_role_id 
  FROM public.account_members 
  WHERE account_id = p_account_id AND user_id = auth.uid();

  IF v_role_id IS NULL THEN 
    RETURN false; 
  END IF;

  -- 3. Verify if that role has explicit explicit read permission
  RETURN EXISTS (
    SELECT 1 FROM public.collection_permissions 
    WHERE role_id = v_role_id 
      AND collection_id = p_collection_id
      AND can_read = true
  );
END;
$$;

-- Replace collection read policy
DROP POLICY IF EXISTS "collections_select_policy" ON public.collections;
CREATE POLICY "collections_select_policy"
ON public.collections FOR SELECT
USING (
  public.user_can_read_collection_metadata(account_id, id)
);
