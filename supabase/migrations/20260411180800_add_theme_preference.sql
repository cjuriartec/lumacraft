-- Update default JSON in the table
ALTER TABLE public.user_profiles
ALTER COLUMN preferences SET DEFAULT '{"sidebarCollapsed": true, "theme": "system"}'::jsonb;

-- Update the handle_new_user_profile trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, preferences)
    VALUES (NEW.id, '{"sidebarCollapsed": true, "theme": "system"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing profiles to ensure they have the theme property
UPDATE public.user_profiles
SET preferences = jsonb_set(preferences, '{theme}', '"system"', true)
WHERE preferences->'theme' IS NULL;
