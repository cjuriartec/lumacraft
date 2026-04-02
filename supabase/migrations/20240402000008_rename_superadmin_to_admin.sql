-- ============================================
-- Sprint 4: Rename Superadmin to Admin
-- ============================================

-- 1. Rename existing roles
UPDATE public.roles 
SET name = 'Admin' 
WHERE name = 'Superadmin' AND is_superadmin = true;

-- 2. Update the trigger to assign 'Admin' directly going forward
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_account_id UUID;
    new_role_id UUID;
    workspace_name TEXT;
BEGIN
    workspace_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Personal'
    );
    workspace_name := 'Espacio de ' || workspace_name;

    INSERT INTO public.accounts (name, owner_id)
    VALUES (workspace_name, NEW.id)
    RETURNING id INTO new_account_id;

    -- Use 'Admin' instead of 'Superadmin'
    INSERT INTO public.roles (account_id, name, is_superadmin)
    VALUES (new_account_id, 'Admin', true)
    RETURNING id INTO new_role_id;

    INSERT INTO public.account_members (account_id, user_id, role_id)
    VALUES (new_account_id, NEW.id, new_role_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
