-- ============================================
-- Phase 1: Security and RBAC fixes (P0)
-- ============================================

-- 1. Fields — Restrict mutations to account admins
DROP POLICY IF EXISTS "fields_insert_policy" ON public.fields;
CREATE POLICY "fields_insert_policy"
ON public.fields FOR INSERT
WITH CHECK (
  public.user_is_account_admin((SELECT c.account_id FROM public.collections c WHERE c.id = collection_id))
);

DROP POLICY IF EXISTS "fields_update_policy" ON public.fields;
CREATE POLICY "fields_update_policy"
ON public.fields FOR UPDATE
USING (
  public.user_is_account_admin((SELECT c.account_id FROM public.collections c WHERE c.id = collection_id))
);

DROP POLICY IF EXISTS "fields_delete_policy" ON public.fields;
CREATE POLICY "fields_delete_policy"
ON public.fields FOR DELETE
USING (
  public.user_is_account_admin((SELECT c.account_id FROM public.collections c WHERE c.id = collection_id))
);

-- 2. Records — Enforce granular CRUD per collection
DROP POLICY IF EXISTS "records_select_policy" ON public.records;
CREATE POLICY "records_select_policy"
ON public.records FOR SELECT
USING (
  public.user_can_access_collection(collection_id, 'read')
);

DROP POLICY IF EXISTS "records_insert_policy" ON public.records;
CREATE POLICY "records_insert_policy"
ON public.records FOR INSERT
WITH CHECK (
  public.user_can_access_collection(collection_id, 'create')
);

DROP POLICY IF EXISTS "records_update_policy" ON public.records;
CREATE POLICY "records_update_policy"
ON public.records FOR UPDATE
USING (
  public.user_can_access_collection(collection_id, 'update')
);

DROP POLICY IF EXISTS "records_delete_policy" ON public.records;
CREATE POLICY "records_delete_policy"
ON public.records FOR DELETE
USING (
  public.user_can_access_collection(collection_id, 'delete')
);

-- 3. Record Relations — Enforce granular CRUD leveraging field_id
DROP POLICY IF EXISTS "record_relations_select_policy" ON public.record_relations;
CREATE POLICY "record_relations_select_policy"
ON public.record_relations FOR SELECT
USING (
  public.user_can_access_collection((SELECT f.collection_id FROM public.fields f WHERE f.id = field_id), 'read')
);

DROP POLICY IF EXISTS "record_relations_insert_policy" ON public.record_relations;
CREATE POLICY "record_relations_insert_policy"
ON public.record_relations FOR INSERT
WITH CHECK (
  public.user_can_access_collection((SELECT f.collection_id FROM public.fields f WHERE f.id = field_id), 'update')
);

DROP POLICY IF EXISTS "record_relations_update_policy" ON public.record_relations;
CREATE POLICY "record_relations_update_policy"
ON public.record_relations FOR UPDATE
USING (
  public.user_can_access_collection((SELECT f.collection_id FROM public.fields f WHERE f.id = field_id), 'update')
);

DROP POLICY IF EXISTS "record_relations_delete_policy" ON public.record_relations;
CREATE POLICY "record_relations_delete_policy"
ON public.record_relations FOR DELETE
USING (
  public.user_can_access_collection((SELECT f.collection_id FROM public.fields f WHERE f.id = field_id), 'update')
);

-- 4. Collection Permissions — Restrict mutations to account admins
DROP POLICY IF EXISTS "collection_permissions_insert_policy" ON public.collection_permissions;
CREATE POLICY "collection_permissions_insert_policy"
ON public.collection_permissions FOR INSERT
WITH CHECK (
  public.user_is_account_admin((SELECT r.account_id FROM public.roles r WHERE r.id = role_id))
);

DROP POLICY IF EXISTS "collection_permissions_update_policy" ON public.collection_permissions;
CREATE POLICY "collection_permissions_update_policy"
ON public.collection_permissions FOR UPDATE
USING (
  public.user_is_account_admin((SELECT r.account_id FROM public.roles r WHERE r.id = role_id))
);

DROP POLICY IF EXISTS "collection_permissions_delete_policy" ON public.collection_permissions;
CREATE POLICY "collection_permissions_delete_policy"
ON public.collection_permissions FOR DELETE
USING (
  public.user_is_account_admin((SELECT r.account_id FROM public.roles r WHERE r.id = role_id))
);
