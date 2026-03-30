-- Function to create personal workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
    new_account_id UUID;
    new_role_id UUID;
BEGIN
    -- 1. Create personal account
    INSERT INTO public.accounts (name, owner_id)
    VALUES ('Cuenta Personal', NEW.id)
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

-- Trigger on auth.users
-- Note: This requires high permissions, normally set via Supabase migrations on local/cloud.
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
