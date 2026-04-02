-- ============================================
-- Security Fix: Prevent Privilege Self-Escalation on account_members
-- ============================================
-- Problem: The existing account_members_update_policy only had a USING clause.
-- In Postgres, for UPDATE policies, USING filters which rows can be targeted,
-- but WITHOUT an explicit WITH CHECK, the check on the NEW row values defaults
-- to the USING expression. This is theoretically correct but can be bypassed
-- if the session context is manipulated. We add explicit WITH CHECK and also
-- add a RESTRICTIVE policy to prevent ANY user from updating their own role.
-- ============================================

-- 1. Drop and recreate the permissive update policy with explicit WITH CHECK
DROP POLICY IF EXISTS "account_members_update_policy" ON public.account_members;

CREATE POLICY "account_members_update_policy"
ON public.account_members
FOR UPDATE
USING (public.user_is_account_admin(account_id))
WITH CHECK (public.user_is_account_admin(account_id));


-- 2. RESTRICTIVE policy: a user can NEVER update their own membership row,
--    even if they happen to be an admin. This prevents self-escalation attacks.
--    (The owner's role is already protected by owner_role_cannot_be_changed_restrictive)
DROP POLICY IF EXISTS "no_self_role_change_restrictive" ON public.account_members;

CREATE POLICY "no_self_role_change_restrictive"
ON public.account_members
AS RESTRICTIVE
FOR UPDATE
USING (user_id != auth.uid())
WITH CHECK (user_id != auth.uid());
