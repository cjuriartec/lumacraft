create table if not exists public.template_preview_cache (
    cache_key text primary key,
    account_id uuid not null references public.accounts(id) on delete cascade,
    template_id uuid not null references public.templates(id) on delete cascade,
    template_version integer not null default 1,
    record_id uuid not null references public.records(id) on delete cascade,
    blocks jsonb not null default '[]'::jsonb,
    warnings jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    last_used_at timestamp with time zone not null default now()
);

create index if not exists idx_template_preview_cache_account
    on public.template_preview_cache(account_id);
create index if not exists idx_template_preview_cache_template_record
    on public.template_preview_cache(template_id, record_id);
create index if not exists idx_template_preview_cache_last_used_at
    on public.template_preview_cache(last_used_at desc);

alter table public.template_preview_cache enable row level security;

drop policy if exists "template_preview_cache_select_policy" on public.template_preview_cache;
create policy "template_preview_cache_select_policy"
on public.template_preview_cache for select
using (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "template_preview_cache_insert_policy" on public.template_preview_cache;
create policy "template_preview_cache_insert_policy"
on public.template_preview_cache for insert
with check (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "template_preview_cache_update_policy" on public.template_preview_cache;
create policy "template_preview_cache_update_policy"
on public.template_preview_cache for update
using (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "template_preview_cache_delete_policy" on public.template_preview_cache;
create policy "template_preview_cache_delete_policy"
on public.template_preview_cache for delete
using (
  account_id in (select public.get_user_workspace_ids())
);

drop trigger if exists tr_template_preview_cache_updated_at on public.template_preview_cache;
create trigger tr_template_preview_cache_updated_at
    before update on public.template_preview_cache
    for each row
    execute function public.handle_updated_at();

grant all on public.template_preview_cache to authenticated;
grant all on public.template_preview_cache to service_role;

create table if not exists public.template_ai_block_cache (
    cache_key text primary key,
    account_id uuid not null references public.accounts(id) on delete cascade,
    provider_id ai_provider_enum not null,
    model text not null,
    blocks jsonb not null default '[]'::jsonb,
    warnings jsonb not null default '[]'::jsonb,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    last_used_at timestamp with time zone not null default now()
);

create index if not exists idx_template_ai_block_cache_account
    on public.template_ai_block_cache(account_id);
create index if not exists idx_template_ai_block_cache_provider_model
    on public.template_ai_block_cache(provider_id, model);
create index if not exists idx_template_ai_block_cache_last_used_at
    on public.template_ai_block_cache(last_used_at desc);

alter table public.template_ai_block_cache enable row level security;

drop policy if exists "template_ai_block_cache_select_policy" on public.template_ai_block_cache;
create policy "template_ai_block_cache_select_policy"
on public.template_ai_block_cache for select
using (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "template_ai_block_cache_insert_policy" on public.template_ai_block_cache;
create policy "template_ai_block_cache_insert_policy"
on public.template_ai_block_cache for insert
with check (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "template_ai_block_cache_update_policy" on public.template_ai_block_cache;
create policy "template_ai_block_cache_update_policy"
on public.template_ai_block_cache for update
using (
  account_id in (select public.get_user_workspace_ids())
);

drop policy if exists "template_ai_block_cache_delete_policy" on public.template_ai_block_cache;
create policy "template_ai_block_cache_delete_policy"
on public.template_ai_block_cache for delete
using (
  account_id in (select public.get_user_workspace_ids())
);

drop trigger if exists tr_template_ai_block_cache_updated_at on public.template_ai_block_cache;
create trigger tr_template_ai_block_cache_updated_at
    before update on public.template_ai_block_cache
    for each row
    execute function public.handle_updated_at();

grant all on public.template_ai_block_cache to authenticated;
grant all on public.template_ai_block_cache to service_role;

create index if not exists idx_record_relations_field_target
    on public.record_relations(field_id, target_record_id);
