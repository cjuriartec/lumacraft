-- Add primary_field_name to collections
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS primary_field_name TEXT;

-- Seed: set primary_field_name to the first field for existing collections
DO $$
BEGIN
    UPDATE public.collections c
    SET primary_field_name = (
        SELECT name
        FROM public.fields f
        WHERE f.collection_id = c.id
        ORDER BY created_at ASC
        LIMIT 1
    );
END $$;
