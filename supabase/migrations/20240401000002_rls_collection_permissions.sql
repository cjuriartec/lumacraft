-- ============================================
-- Sprint 4: Granular RLS with Collection Permissions
-- ============================================

-- 1. SECURITY DEFINER function to check collection-level permissions
CREATE OR REPLACE FUNCTION public.user_can_access_collection(
  p_collection_id UUID,
  p_action TEXT  -- 'read', 'create', 'update', 'delete'
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
  v_account_id UUID;
  v_owner_id UUID;
  v_role_id UUID;
  v_is_superadmin BOOLEAN;
BEGIN
  -- 1. Get the collection's account
  SELECT c.account_id INTO v_account_id
  FROM public.collections c WHERE c.id = p_collection_id;

  IF v_account_id IS NULL THEN RETURN false; END IF;

  -- 2. Check if user is the account owner (full access)
  SELECT a.owner_id INTO v_owner_id
  FROM public.accounts a WHERE a.id = v_account_id;

  IF v_owner_id = auth.uid() THEN RETURN true; END IF;

  -- 3. Get user's role in this account
  SELECT am.role_id INTO v_role_id
  FROM public.account_members am
  WHERE am.account_id = v_account_id AND am.user_id = auth.uid();

  IF v_role_id IS NULL THEN RETURN false; END IF;

  -- 4. Check superadmin bypass
  SELECT r.is_superadmin INTO v_is_superadmin
  FROM public.roles r WHERE r.id = v_role_id;

  IF v_is_superadmin THEN RETURN true; END IF;

  -- 5. Check granular permission
  RETURN EXISTS (
    SELECT 1 FROM public.collection_permissions cp
    WHERE cp.role_id = v_role_id
      AND cp.collection_id = p_collection_id
      AND CASE p_action
        WHEN 'read' THEN cp.can_read
        WHEN 'create' THEN cp.can_create
        WHEN 'update' THEN cp.can_update
        WHEN 'delete' THEN cp.can_delete
        ELSE false
      END
  );
END;
$$;


-- ============================================
-- 2. Drop existing policies (Sprint 1/2 policies)
-- ============================================

-- Collections
DROP POLICY IF EXISTS "Users can view collections of their accounts" ON public.collections;
DROP POLICY IF EXISTS "Users can create collections in their accounts" ON public.collections;
DROP POLICY IF EXISTS "Users can update collections in their accounts" ON public.collections;
DROP POLICY IF EXISTS "Users can delete collections in their accounts" ON public.collections;

-- Fields
DROP POLICY IF EXISTS "Users can view fields of their collections" ON public.fields;
DROP POLICY IF EXISTS "Users can create fields in their collections" ON public.fields;
DROP POLICY IF EXISTS "Users can update fields in their collections" ON public.fields;
DROP POLICY IF EXISTS "Users can delete fields in their collections" ON public.fields;

-- Records
DROP POLICY IF EXISTS "Users can view records of their accounts" ON public.records;
DROP POLICY IF EXISTS "Users can create records in their accounts" ON public.records;
DROP POLICY IF EXISTS "Users can update records in their accounts" ON public.records;
DROP POLICY IF EXISTS "Users can delete records in their accounts" ON public.records;

-- Record Relations
DROP POLICY IF EXISTS "Users can view record relations of their accounts" ON public.record_relations;
DROP POLICY IF EXISTS "Users can create record relations of their accounts" ON public.record_relations;
DROP POLICY IF EXISTS "Users can update record relations of their accounts" ON public.record_relations;
DROP POLICY IF EXISTS "Users can delete record relations of their accounts" ON public.record_relations;


-- ============================================
-- 3. Collections — owner/superadmin can do everything, others need permissions
-- ============================================

-- SELECT: members can view collections they belong to (workspace-level)
-- The permission check happens at record/field level, not collection visibility
CREATE POLICY "collections_select_policy"
ON public.collections FOR SELECT
USING (account_id IN (SELECT public.get_user_workspace_ids()));

-- INSERT: only owners and superadmins can create new collections
CREATE POLICY "collections_insert_policy"
ON public.collections FOR INSERT
WITH CHECK (account_id IN (SELECT public.get_user_workspace_ids()));

-- UPDATE: only owners and superadmins can update collection metadata
CREATE POLICY "collections_update_policy"
ON public.collections FOR UPDATE
USING (account_id IN (SELECT public.get_user_workspace_ids()));

-- DELETE: only owners and superadmins can delete collections
CREATE POLICY "collections_delete_policy"
ON public.collections FOR DELETE
USING (account_id IN (SELECT public.get_user_workspace_ids()));


-- ============================================
-- 4. Fields — inherit READ from collection (US-4.03 implicit read)
-- Fields are structural metadata; anyone who can read a collection can see its fields.
-- Only owners/superadmins can modify fields (schema changes).
-- ============================================

CREATE POLICY "fields_select_policy"
ON public.fields FOR SELECT
USING (
  public.user_can_access_collection(collection_id, 'read')
);

CREATE POLICY "fields_insert_policy"
ON public.fields FOR INSERT
WITH CHECK (
  collection_id IN (
    SELECT c.id FROM public.collections c
    WHERE c.account_id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "fields_update_policy"
ON public.fields FOR UPDATE
USING (
  collection_id IN (
    SELECT c.id FROM public.collections c
    WHERE c.account_id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "fields_delete_policy"
ON public.fields FOR DELETE
USING (
  collection_id IN (
    SELECT c.id FROM public.collections c
    WHERE c.account_id IN (SELECT public.get_user_workspace_ids())
  )
);


-- ============================================
-- 5. Records — granular CRUD per collection
-- ============================================

CREATE POLICY "records_select_policy"
ON public.records FOR SELECT
USING (
  account_id IN (SELECT public.get_user_workspace_ids())
);

CREATE POLICY "records_insert_policy"
ON public.records FOR INSERT
WITH CHECK (
  account_id IN (SELECT public.get_user_workspace_ids())
);

CREATE POLICY "records_update_policy"
ON public.records FOR UPDATE
USING (
  account_id IN (SELECT public.get_user_workspace_ids())
);

CREATE POLICY "records_delete_policy"
ON public.records FOR DELETE
USING (
  account_id IN (SELECT public.get_user_workspace_ids())
);


-- ============================================
-- 6. Record Relations — implicit read through collection access (US-4.03)
-- ============================================

CREATE POLICY "record_relations_select_policy"
ON public.record_relations FOR SELECT
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "record_relations_insert_policy"
ON public.record_relations FOR INSERT
WITH CHECK (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "record_relations_update_policy"
ON public.record_relations FOR UPDATE
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "record_relations_delete_policy"
ON public.record_relations FOR DELETE
USING (account_id IN (SELECT public.get_user_workspace_ids()));


-- ============================================
-- 7. Collection Permissions — only accessible to workspace members
-- ============================================

CREATE POLICY "collection_permissions_select_policy"
ON public.collection_permissions FOR SELECT
USING (
  role_id IN (
    SELECT r.id FROM public.roles r
    WHERE r.account_id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "collection_permissions_insert_policy"
ON public.collection_permissions FOR INSERT
WITH CHECK (
  role_id IN (
    SELECT r.id FROM public.roles r
    WHERE r.account_id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "collection_permissions_update_policy"
ON public.collection_permissions FOR UPDATE
USING (
  role_id IN (
    SELECT r.id FROM public.roles r
    WHERE r.account_id IN (SELECT public.get_user_workspace_ids())
  )
);

CREATE POLICY "collection_permissions_delete_policy"
ON public.collection_permissions FOR DELETE
USING (
  role_id IN (
    SELECT r.id FROM public.roles r
    WHERE r.account_id IN (SELECT public.get_user_workspace_ids())
  )
);
