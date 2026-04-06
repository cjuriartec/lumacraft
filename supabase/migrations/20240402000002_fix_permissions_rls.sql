-- ============================================
-- Sprint 4: Additional RLS fixes (Collection Permissions)
-- ============================================

-- 1. Collection Permissions — Management restricted to admins
-- ============================================

DROP POLICY IF EXISTS "collection_permissions_insert_policy" ON public.collection_permissions;
CREATE POLICY "collection_permissions_insert_policy"
ON public.collection_permissions FOR INSERT
WITH CHECK (
  role_id IN (
    SELECT r.id FROM public.roles r
    WHERE public.user_is_account_admin(r.account_id)
  )
);

DROP POLICY IF EXISTS "collection_permissions_update_policy" ON public.collection_permissions;
CREATE POLICY "collection_permissions_update_policy"
ON public.collection_permissions FOR UPDATE
USING (
  role_id IN (
    SELECT r.id FROM public.roles r
    WHERE public.user_is_account_admin(r.account_id)
  )
);

DROP POLICY IF EXISTS "collection_permissions_delete_policy" ON public.collection_permissions;
CREATE POLICY "collection_permissions_delete_policy"
ON public.collection_permissions FOR DELETE
USING (
  role_id IN (
    SELECT r.id FROM public.roles r
    WHERE public.user_is_account_admin(r.account_id)
  )
);
