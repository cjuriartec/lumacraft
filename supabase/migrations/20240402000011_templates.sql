-- Migration: templates table and RLS policies
-- 20240402000011_templates.sql

CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
    blocks JSONB NOT NULL DEFAULT '[]',
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_templates_account ON public.templates(account_id);
CREATE INDEX IF NOT EXISTS idx_templates_collection ON public.templates(collection_id);

-- Enable RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Select policy: Allow members of the same account to read
CREATE POLICY "Allow members to read templates" ON public.templates
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.account_members
            WHERE account_members.account_id = templates.account_id
            AND account_members.user_id = auth.uid()
        )
    );

-- Insert policy: Allow admins/owners of the same account to create
CREATE POLICY "Allow admins to insert templates" ON public.templates
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.account_members am
            JOIN public.roles r ON am.role_id = r.id
            WHERE am.account_id = templates.account_id
            AND am.user_id = auth.uid()
            AND (r.name = 'ADMIN' OR r.is_superadmin = true)
        )
    );

-- Update policy: Allow admins/owners of the same account to update
CREATE POLICY "Allow admins to update templates" ON public.templates
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.account_members am
            JOIN public.roles r ON am.role_id = r.id
            WHERE am.account_id = templates.account_id
            AND am.user_id = auth.uid()
            AND (r.name = 'ADMIN' OR r.is_superadmin = true)
        )
    );

-- Delete policy: Allow admins/owners of the same account to delete
CREATE POLICY "Allow admins to delete templates" ON public.templates
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.account_members am
            JOIN public.roles r ON am.role_id = r.id
            WHERE am.account_id = templates.account_id
            AND am.user_id = auth.uid()
            AND (r.name = 'ADMIN' OR r.is_superadmin = true)
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_templates_updated_at ON public.templates;
CREATE TRIGGER tr_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

GRANT ALL ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
