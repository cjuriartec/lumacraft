-- ============================================
-- Sprint 4: Security Hardening (Owner & Role Protection)
-- ============================================

-- 1. Helper function to check if a user is the absolute owner of an account
CREATE OR REPLACE FUNCTION public.is_account_owner(p_account_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.accounts
    WHERE id = p_account_id AND owner_id = auth.uid()
  );
END;
$$;

-- 2. RESTRICTIVE policies for account_members
-- A restrictive policy must be satisfied IN ADDITION to permissive policies.
-- This prevents the owner from being removed or having their role changed, 
-- even if the actor is an admin (which the owner is).

ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Prevent removing the owner from the account_members table
CREATE POLICY "owner_cannot_be_removed_restrictive"
ON public.account_members
AS RESTRICTIVE
FOR DELETE
USING (
  user_id != (SELECT owner_id FROM public.accounts WHERE id = account_id)
);

-- Prevent changing the owner's role
CREATE POLICY "owner_role_cannot_be_changed_restrictive"
ON public.account_members
AS RESTRICTIVE
FOR UPDATE
USING (
  user_id != (SELECT owner_id FROM public.accounts WHERE id = account_id)
);

-- 3. RESTRICTIVE policies for roles
-- Prevent deleting any role marked as is_superadmin

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_role_cannot_be_deleted_restrictive"
ON public.roles
AS RESTRICTIVE
FOR DELETE
USING (NOT is_superadmin);

-- Prevent unmarking a role as superadmin or changing its account_id (integrity)
CREATE POLICY "superadmin_role_integrity_restrictive"
ON public.roles
AS RESTRICTIVE
FOR UPDATE
USING (NOT is_superadmin)
WITH CHECK (NOT is_superadmin);
