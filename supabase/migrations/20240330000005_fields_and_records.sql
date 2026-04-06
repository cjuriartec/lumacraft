-- ============================================
-- Sprint 2: Fields & Records Tables
-- ============================================

-- FIELDS (Schema definition per Collection)
CREATE TABLE public.fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    field_type field_type_enum NOT NULL DEFAULT 'TEXT',
    is_required BOOLEAN DEFAULT false,
    is_unique BOOLEAN DEFAULT false,
    default_value TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, name)
);

-- RECORDS (Dynamic data storage)
CREATE TABLE public.records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_fields_collection ON public.fields(collection_id);
CREATE INDEX idx_fields_sort ON public.fields(collection_id, sort_order);
CREATE INDEX idx_records_collection ON public.records(collection_id);
CREATE INDEX idx_records_account ON public.records(account_id);
CREATE INDEX idx_records_data_gin ON public.records USING GIN (data);

-- Enable RLS
ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;
