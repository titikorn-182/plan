begin;

create table public.system_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique check (singleton),
  allowed_email_domain text not null default 'ubu.ac.th'
    check (allowed_email_domain = lower(allowed_email_domain) and allowed_email_domain !~ '@'),
  default_fiscal_year_id uuid references public.fiscal_years(id),
  default_quarter smallint not null default 1 check (default_quarter between 1 and 4),
  reminder_days_before smallint not null default 7 check (reminder_days_before between 1 and 90),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.system_settings (
  id,
  singleton,
  allowed_email_domain,
  default_fiscal_year_id,
  default_quarter,
  reminder_days_before
)
select
  '00000000-0000-0000-0000-000000000001',
  true,
  'ubu.ac.th',
  (select id from public.fiscal_years where status = 'open' order by buddhist_year desc limit 1),
  1,
  7;

create trigger touch_system_settings
  before update on public.system_settings
  for each row execute function private.touch_timestamp();

alter table public.system_settings enable row level security;
revoke all on table public.system_settings from public, anon, authenticated;
grant select, insert, update on table public.system_settings to authenticated;

create policy system_settings_select on public.system_settings for select to authenticated
  using (true);
create policy system_settings_admin_insert on public.system_settings for insert to authenticated
  with check (private.user_has_role('admin'));
create policy system_settings_admin_update on public.system_settings for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));

create table private.admin_email_allowlist (
  email text primary key check (email = lower(email))
);

insert into private.admin_email_allowlist (email)
values ('titikornrasmi.s@ubu.ac.th')
on conflict do nothing;

create or replace function private.ensure_allowlisted_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from private.admin_email_allowlist allowed
    where allowed.email = lower(new.email)
  ) then
    insert into public.user_roles (profile_id, role, organization_id, created_by)
    values (new.id, 'admin', null, new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.ensure_allowlisted_admin() from public, anon, authenticated;

create trigger ensure_allowlisted_admin
  after insert on public.profiles
  for each row execute function private.ensure_allowlisted_admin();

update public.profiles
set is_active = true
where lower(email) = 'titikornrasmi.s@ubu.ac.th';

insert into public.user_roles (profile_id, role, organization_id, created_by)
select id, 'admin', null, id
from public.profiles
where lower(email) = 'titikornrasmi.s@ubu.ac.th'
on conflict do nothing;

create or replace function private.prevent_organization_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'organization cannot be its own parent' using errcode = '23514';
  end if;
  if exists (
    with recursive ancestors as (
      select organization.id, organization.parent_id
      from public.organizations organization
      where organization.id = new.parent_id
      union
      select organization.id, organization.parent_id
      from public.organizations organization
      join ancestors on organization.id = ancestors.parent_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'organization hierarchy cannot contain a cycle' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_organization_cycle() from public, anon, authenticated;
create trigger prevent_organization_cycle
  before insert or update of parent_id on public.organizations
  for each row execute function private.prevent_organization_cycle();

create or replace function public.admin_user_access_quality()
returns table (
  active_users bigint,
  users_without_roles bigint,
  users_without_scopes bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.user_has_role('admin') then
    raise exception 'administrator role required' using errcode = '42501';
  end if;
  return query
  select
    count(*)::bigint,
    count(*) filter (
      where not exists (
        select 1 from public.user_roles role_row where role_row.profile_id = profile.id
      )
    )::bigint,
    count(*) filter (
      where not exists (
        select 1 from public.user_organization_scopes scope_row
        where scope_row.profile_id = profile.id
      )
    )::bigint
  from public.profiles profile
  where profile.is_active;
end;
$$;

revoke all on function public.admin_user_access_quality() from public, anon;
grant execute on function public.admin_user_access_quality() to authenticated;

drop trigger if exists audit_organizations on public.organizations;
create trigger audit_organizations
  after insert or update or delete on public.organizations
  for each row execute function private.audit_record_change('organization');
drop trigger if exists audit_fiscal_years on public.fiscal_years;
create trigger audit_fiscal_years
  after insert or update or delete on public.fiscal_years
  for each row execute function private.audit_record_change('fiscal_year');
drop trigger if exists audit_budget_cycles on public.budget_cycles;
create trigger audit_budget_cycles
  after insert or update or delete on public.budget_cycles
  for each row execute function private.audit_record_change('budget_cycle');
drop trigger if exists audit_system_settings on public.system_settings;
create trigger audit_system_settings
  after insert or update or delete on public.system_settings
  for each row execute function private.audit_record_change('system_setting');

create or replace function public.admin_restore_record(
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  restored boolean := false;
begin
  if not private.user_has_role('admin') then
    raise exception 'administrator role required' using errcode = '42501';
  end if;

  case p_entity_type
    when 'budget_request' then
      update public.budget_requests set archived_at = null where id = p_entity_id and archived_at is not null;
    when 'project' then
      update public.projects set archived_at = null where id = p_entity_id and archived_at is not null;
    when 'attachment' then
      update public.attachments set archived_at = null where id = p_entity_id and archived_at is not null;
    when 'comment' then
      update public.comments set archived_at = null where id = p_entity_id and archived_at is not null;
    when 'fiscal_year' then
      update public.fiscal_years set status = 'closed' where id = p_entity_id and status = 'archived';
    else
      raise exception 'unsupported entity type' using errcode = '22023';
  end case;

  restored := found;
  if restored then
    insert into public.audit_events (
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      reason
    ) values (
      (select auth.uid()),
      private.current_app_role(),
      'restore',
      p_entity_type,
      p_entity_id,
      'restored from admin trash'
    );
  end if;
  return restored;
end;
$$;

revoke all on function public.admin_restore_record(text, uuid) from public, anon;
grant execute on function public.admin_restore_record(text, uuid) to authenticated;

commit;
