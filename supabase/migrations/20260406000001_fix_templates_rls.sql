-- Migration: Fix templates RLS consistency
-- 20260406000001_fix_templates_rls.sql

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow admins to insert templates" ON public.templates;
DROP POLICY IF EXISTS "Allow admins to update templates" ON public.templates;
DROP POLICY IF EXISTS "Allow admins to delete templates" ON public.templates;

-- Re-create policies using the shared user_is_account_admin function
-- This ensures account owners have access even if roles are missing/desynced.

-- Insert policy: Allow admins/owners of the same account to create
CREATE POLICY "templates_insert_policy" ON public.templates
    FOR INSERT
    WITH CHECK (public.user_is_account_admin(account_id));

-- Update policy: Allow admins/owners of the same account to update
CREATE POLICY "templates_update_policy" ON public.templates
    FOR UPDATE
    USING (public.user_is_account_admin(account_id));

-- Delete policy: Allow admins/owners of the same account to delete
CREATE POLICY "templates_delete_policy" ON public.templates
    FOR DELETE
    USING (public.user_is_account_admin(account_id));
