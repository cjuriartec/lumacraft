-- Add full_name and avatar_url to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update handle_new_user_profile to seed from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, preferences, full_name, avatar_url)
    VALUES (
        NEW.id, 
        '{"sidebarCollapsed": true, "theme": "system"}'::jsonb,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing profiles with metadata if they are null
UPDATE public.user_profiles up
SET 
    full_name = COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
    avatar_url = u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE up.id = u.id AND up.full_name IS NULL;
