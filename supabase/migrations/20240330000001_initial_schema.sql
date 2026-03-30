-- 1. ENUMs
CREATE TYPE field_type_enum AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'ENUM', 'RELATION', 'FILE', 'LOCATION');
CREATE TYPE relation_type_enum AS ENUM ('ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_MANY');
CREATE TYPE trigger_event_enum AS ENUM ('ON_CREATE', 'ON_UPDATE', 'ON_DELETE');
CREATE TYPE trigger_status_enum AS ENUM ('SUCCESS', 'FAILED', 'PENDING');
CREATE TYPE doc_format_enum AS ENUM ('PDF', 'DOCX', 'HTML');
CREATE TYPE ai_provider_enum AS ENUM ('GEMINI', 'OPENAI', 'ANTHROPIC');
CREATE TYPE on_delete_enum AS ENUM ('CASCADE', 'SET_NULL', 'RESTRICT');
CREATE TYPE permission_action_enum AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE');

-- 2. ACCOUNTS (Workspaces)
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL, -- References auth.users(id)
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ROLES (Custom per Account)
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_superadmin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, name)
);

-- 4. ACCOUNT MEMBERS
CREATE TABLE public.account_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id)
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, user_id)
);

-- 5. COLLECTIONS
CREATE TABLE public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, name)
);

-- 6. PERMISSIONS
CREATE TABLE public.collection_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
    can_read BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    UNIQUE(role_id, collection_id)
);

-- Indices
CREATE INDEX idx_accounts_owner ON public.accounts(owner_id);
CREATE INDEX idx_members_user ON public.account_members(user_id);
CREATE INDEX idx_members_account ON public.account_members(account_id);
CREATE INDEX idx_roles_account ON public.roles(account_id);
CREATE INDEX idx_collections_account ON public.collections(account_id);

-- RLS (Enable but allow all for dev, or setup properly)
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_permissions ENABLE ROW LEVEL SECURITY;
