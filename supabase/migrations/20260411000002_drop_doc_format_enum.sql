DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'doc_format_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    DROP TYPE public.doc_format_enum;
  END IF;
END
$$;
