-- ============================================
-- Sprint 4: Admin Management (Roles & Members)
-- ============================================

-- 1. SECURITY DEFINER function to check if user is an account admin
CREATE OR REPLACE FUNCTION public.user_is_account_admin(p_account_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
  v_owner_id UUID;
  v_is_superadmin BOOLEAN;
BEGIN
  -- 1. Check if user is the account owner (full access)
  SELECT a.owner_id INTO v_owner_id
  FROM public.accounts a WHERE a.id = p_account_id;

  IF v_owner_id = auth.uid() THEN RETURN true; END IF;

  -- 2. Check if user has a superadmin role in this account
  SELECT r.is_superadmin INTO v_is_superadmin
  FROM public.account_members am
  JOIN public.roles r ON am.role_id = r.id
  WHERE am.account_id = p_account_id AND am.user_id = auth.uid();

  RETURN COALESCE(v_is_superadmin, false);
END;
$$;


-- ============================================
-- 2. Roles — management restricted to admins
-- ============================================

-- INSERT: only admins can create new roles
CREATE POLICY "roles_insert_policy"
ON public.roles FOR INSERT
WITH CHECK (public.user_is_account_admin(account_id));

-- UPDATE: only admins can update roles
CREATE POLICY "roles_update_policy"
ON public.roles FOR UPDATE
USING (public.user_is_account_admin(account_id));

-- DELETE: only admins can delete roles
CREATE POLICY "roles_delete_policy"
ON public.roles FOR DELETE
USING (public.user_is_account_admin(account_id));


-- ============================================
-- 3. Account Members — management restricted to admins
-- ============================================

-- INSERT: only admins can add members
CREATE POLICY "account_members_insert_policy"
ON public.account_members FOR INSERT
WITH CHECK (public.user_is_account_admin(account_id));

-- UPDATE: only admins can update member roles
CREATE POLICY "account_members_update_policy"
ON public.account_members FOR UPDATE
USING (public.user_is_account_admin(account_id));

-- DELETE: only admins can remove members
CREATE POLICY "account_members_delete_policy"
ON public.account_members FOR DELETE
USING (public.user_is_account_admin(account_id));


-- ============================================
-- 4. Collections — Update creation policy to be admin-only (Optional but recommended)
-- ============================================

DROP POLICY IF EXISTS "collections_insert_policy" ON public.collections;
CREATE POLICY "collections_insert_policy"
ON public.collections FOR INSERT
WITH CHECK (public.user_is_account_admin(account_id));

DROP POLICY IF EXISTS "collections_update_policy" ON public.collections;
CREATE POLICY "collections_update_policy"
ON public.collections FOR UPDATE
USING (public.user_is_account_admin(account_id));

DROP POLICY IF EXISTS "collections_delete_policy" ON public.collections;
CREATE POLICY "collections_delete_policy"
ON public.collections FOR DELETE
USING (public.user_is_account_admin(account_id));
