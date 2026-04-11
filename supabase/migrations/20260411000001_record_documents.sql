-- Persisted compiled/editable documents per record + template

create table if not exists public.record_documents (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references public.accounts(id) on delete cascade,
    collection_id uuid not null references public.collections(id) on delete cascade,
    record_id uuid not null references public.records(id) on delete cascade,
    template_id uuid not null references public.templates(id) on delete cascade,
    compiled_blocks jsonb not null default '[]'::jsonb,
    edited_blocks jsonb not null default '[]'::jsonb,
    source_template_version integer not null default 1,
    version integer not null default 1,
    compiled_at timestamp with time zone,
    last_edited_at timestamp with time zone,
    created_by uuid references auth.users(id) on delete set null,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    unique(template_id, record_id)
);

create index if not exists idx_record_documents_account on public.record_documents(account_id);
create index if not exists idx_record_documents_collection on public.record_documents(collection_id);
create index if not exists idx_record_documents_record on public.record_documents(record_id);
create index if not exists idx_record_documents_template on public.record_documents(template_id);

alter table public.record_documents enable row level security;

drop policy if exists "record_documents_select_policy" on public.record_documents;
create policy "record_documents_select_policy"
on public.record_documents for select
using (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "record_documents_insert_policy" on public.record_documents;
create policy "record_documents_insert_policy"
on public.record_documents for insert
with check (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "record_documents_update_policy" on public.record_documents;
create policy "record_documents_update_policy"
on public.record_documents for update
using (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "record_documents_delete_policy" on public.record_documents;
create policy "record_documents_delete_policy"
on public.record_documents for delete
using (
  account_id in (select public.get_user_workspace_ids())
);

drop trigger if exists tr_record_documents_updated_at on public.record_documents;
create trigger tr_record_documents_updated_at
    before update on public.record_documents
    for each row
    execute function public.handle_updated_at();

grant all on public.record_documents to authenticated;
grant all on public.record_documents to service_role;
