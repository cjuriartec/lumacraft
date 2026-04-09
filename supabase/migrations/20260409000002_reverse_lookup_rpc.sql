-- ============================================
-- Sprint 9: Reverse Lookup RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.resolve_reverse_lookup(
    target_collection_id UUID,
    target_field_name TEXT,
    source_record_id UUID
)
RETURNS TABLE (
    id UUID,
    collection_id UUID,
    account_id UUID,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.collection_id, r.account_id, r.data, r.created_at, r.updated_at
    FROM public.records r
    WHERE r.collection_id = target_collection_id
      AND (
          -- Check if it's a single UUID string (Singular Relations)
          (r.data ->> target_field_name) = source_record_id::TEXT
          OR
          -- Check if it's an array of UUIDs (Plural Relations)
          r.data -> target_field_name @> jsonb_build_array(source_record_id::TEXT)
      );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.resolve_reverse_lookup(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_reverse_lookup(UUID, TEXT, UUID) TO service_role;
