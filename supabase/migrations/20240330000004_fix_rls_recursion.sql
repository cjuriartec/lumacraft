-- 1. Create a function to securely fetch user workspaces without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS TABLE (account_id uuid)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY 
    SELECT am.account_id 
    FROM public.account_members am 
    WHERE am.user_id = auth.uid();
END;
$$;

-- 2. Drop the old recursive policies
DROP POLICY IF EXISTS "Users can view accounts they are members of" ON public.accounts;
DROP POLICY IF EXISTS "Users can view roles of their accounts" ON public.roles;
DROP POLICY IF EXISTS "Users can view members of their accounts" ON public.account_members;
DROP POLICY IF EXISTS "Users can view collections of their accounts" ON public.collections;
DROP POLICY IF EXISTS "Users can create collections in their accounts" ON public.collections;
DROP POLICY IF EXISTS "Users can update collections in their accounts" ON public.collections;
DROP POLICY IF EXISTS "Users can delete collections in their accounts" ON public.collections;

-- 3. Recreate policies using the secure function (avoids infinite recursion)
-- Accounts
CREATE POLICY "Users can view accounts they are members of"
ON public.accounts FOR SELECT
USING (
    id IN (SELECT public.get_user_workspace_ids()) 
    OR owner_id = auth.uid()
);

-- Roles
CREATE POLICY "Users can view roles of their accounts"
ON public.roles FOR SELECT
USING (account_id IN (SELECT public.get_user_workspace_ids()));

-- Members (The one that caused the recursion)
CREATE POLICY "Users can view members of their accounts"
ON public.account_members FOR SELECT
USING (account_id IN (SELECT public.get_user_workspace_ids()));

-- Collections
CREATE POLICY "Users can view collections of their accounts"
ON public.collections FOR SELECT
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can create collections in their accounts"
ON public.collections FOR INSERT
WITH CHECK (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can update collections in their accounts"
ON public.collections FOR UPDATE
USING (account_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Users can delete collections in their accounts"
ON public.collections FOR DELETE
USING (account_id IN (SELECT public.get_user_workspace_ids()));
