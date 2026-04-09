-- ============================================
-- Sprint 9: Purge Field Data RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.purge_field_data(
    p_collection_id UUID,
    p_field_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.records
    SET data = data - p_field_name
    WHERE collection_id = p_collection_id;
END;
$$;

-- Grant execution to service role (orchestrated via Use Case)
GRANT EXECUTE ON FUNCTION public.purge_field_data(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_field_data(UUID, TEXT) TO service_role;
