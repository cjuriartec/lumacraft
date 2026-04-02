-- ============================================
-- Sprint 4: Dynamic Workspace names
-- ============================================
-- Overrides the previous "handle_new_user" trigger to extract
-- the name of the user from user metadata or email, avoiding the
-- generic "Cuenta Personal" name.
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_account_id UUID;
    new_role_id UUID;
    workspace_name TEXT;
BEGIN
    -- Extract the best available name. 
    -- 1. Try full_name 
    -- 2. Try name
    -- 3. Try splitting email before the @
    -- 4. Fallback to "Personal"
    workspace_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Personal'
    );
    workspace_name := 'Espacio de ' || workspace_name;

    -- 1. Create personal account with dynamic name
    INSERT INTO public.accounts (name, owner_id)
    VALUES (workspace_name, NEW.id)
    RETURNING id INTO new_account_id;

    -- 2. Create Superadmin role for that account
    INSERT INTO public.roles (account_id, name, is_superadmin)
    VALUES (new_account_id, 'Superadmin', true)
    RETURNING id INTO new_role_id;

    -- 3. Add user as member with that role
    INSERT INTO public.account_members (account_id, user_id, role_id)
    VALUES (new_account_id, NEW.id, new_role_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
