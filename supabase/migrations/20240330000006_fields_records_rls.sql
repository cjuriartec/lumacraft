-- ============================================
-- Sprint 2: RLS Policies for Fields & Records
-- ============================================
-- Uses the existing get_user_workspace_ids() SECURITY DEFINER function
-- to avoid infinite recursion (same pattern as Sprint 1 fix).

-- ========== FIELDS ==========

-- Fields inherit access from their parent collection's account
CREATE POLICY "Users can view fields of their collections"
ON public.fields FOR SELECT
USING (
    collection_id IN (
        SELECT c.id FROM public.collections c
        WHERE c.account_id IN (SELECT public.get_user_workspace_ids())
    )
);

CREATE POLICY "Users can create fields in their collections"
ON public.fields FOR INSERT
WITH CHECK (
    collection_id IN (
        SELECT c.id FROM public.collections c
        WHERE c.account_id IN (SELECT public.get_user_workspace_ids())
    )
);

CREATE POLICY "Users can update fields in their collections"
ON public.fields FOR UPDATE
USING (
    collection_id IN (
        SELECT c.id FROM public.collections c
        WHERE c.account_id IN (SELECT public.get_user_workspace_ids())
    )
);

CREATE POLICY "Users can delete fields in their collections"
ON public.fields FOR DELETE
USING (
    collection_id IN (
        SELECT c.id FROM public.collections c
        WHERE c.account_id IN (SELECT public.get_user_workspace_ids())
    )
);

-- ========== RECORDS ==========

CREATE POLICY "Users can view records of their accounts"
ON public.records FOR SELECT
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can create records in their accounts"
ON public.records FOR INSERT
WITH CHECK (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can update records in their accounts"
ON public.records FOR UPDATE
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can delete records in their accounts"
ON public.records FOR DELETE
USING (account_id IN (SELECT public.get_user_workspace_ids()));
