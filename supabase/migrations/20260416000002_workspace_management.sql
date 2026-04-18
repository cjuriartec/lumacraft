create or replace function public.bootstrap_workspace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_role_id uuid;
begin
  insert into public.roles (account_id, name, description, is_superadmin)
  values (
    NEW.id,
    'Administrador',
    'Rol con acceso administrativo total al workspace.',
    true
  )
  on conflict (account_id, name) do update
    set is_superadmin = excluded.is_superadmin
  returning id into admin_role_id;

  if admin_role_id is null then
    select r.id
      into admin_role_id
      from public.roles r
     where r.account_id = NEW.id
       and (r.is_superadmin = true or r.name = 'Administrador')
     order by r.is_superadmin desc, r.created_at asc
     limit 1;
  end if;

  insert into public.account_members (account_id, user_id, role_id)
  values (NEW.id, NEW.owner_id, admin_role_id)
  on conflict (account_id, user_id) do update
    set role_id = coalesce(public.account_members.role_id, excluded.role_id);

  return NEW;
end;
$$;

drop policy if exists "accounts_insert_policy" on public.accounts;
create policy "accounts_insert_policy"
on public.accounts for insert
to authenticated
with check (
  auth.uid() is not null
  and owner_id = auth.uid()
);

drop policy if exists "accounts_update_policy" on public.accounts;
create policy "accounts_update_policy"
on public.accounts for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop trigger if exists tr_accounts_updated_at on public.accounts;
create trigger tr_accounts_updated_at
before update on public.accounts
for each row
execute function public.handle_updated_at();

drop trigger if exists trg_accounts_bootstrap on public.accounts;
create trigger trg_accounts_bootstrap
after insert on public.accounts
for each row
execute function public.bootstrap_workspace();

insert into public.roles (account_id, name, description, is_superadmin)
select
  a.id,
  'Administrador',
  'Rol con acceso administrativo total al workspace.',
  true
from public.accounts a
where not exists (
  select 1
  from public.roles r
  where r.account_id = a.id
    and (r.is_superadmin = true or r.name = 'Administrador')
)
on conflict (account_id, name) do nothing;

insert into public.account_members (account_id, user_id, role_id)
select distinct on (a.id)
  a.id,
  a.owner_id,
  r.id
from public.accounts a
join public.roles r
  on r.account_id = a.id
 and (r.is_superadmin = true or r.name = 'Administrador')
where not exists (
  select 1
  from public.account_members am
  where am.account_id = a.id
    and am.user_id = a.owner_id
)
order by a.id, r.is_superadmin desc, r.created_at asc
on conflict (account_id, user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger as $$
declare
    workspace_name text;
begin
    workspace_name := coalesce(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Personal'
    );
    workspace_name := 'Espacio de ' || workspace_name;

    insert into public.accounts (name, owner_id)
    values (workspace_name, NEW.id);

    return NEW;
end;
$$ language plpgsql security definer set search_path = '';
