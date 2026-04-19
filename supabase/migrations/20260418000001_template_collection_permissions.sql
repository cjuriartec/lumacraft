-- Migration: align template writes with collection permissions
-- 20260418000001_template_collection_permissions.sql

drop policy if exists "templates_insert_policy" on public.templates;
drop policy if exists "templates_update_policy" on public.templates;
drop policy if exists "templates_delete_policy" on public.templates;

create policy "templates_insert_policy" on public.templates
for insert
with check (
  public.user_is_account_admin(account_id)
  or (
    collection_id is not null
    and public.user_can_access_collection(collection_id, 'create')
  )
);

create policy "templates_update_policy" on public.templates
for update
using (
  public.user_is_account_admin(account_id)
  or (
    collection_id is not null
    and public.user_can_access_collection(collection_id, 'update')
  )
)
with check (
  public.user_is_account_admin(account_id)
  or (
    collection_id is not null
    and public.user_can_access_collection(collection_id, 'update')
  )
);

create policy "templates_delete_policy" on public.templates
for delete
using (
  public.user_is_account_admin(account_id)
  or (
    collection_id is not null
    and public.user_can_access_collection(collection_id, 'delete')
  )
);
