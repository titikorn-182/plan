begin;

-- Regression covered by tests/database/access-and-workflow.test.ts.
-- Both access tables define created_by, not granted_by. Keep the operation atomic.
create or replace function public.admin_update_user_access(
  p_profile_id uuid,
  p_full_name text,
  p_is_active boolean,
  p_roles text[],
  p_organization_ids uuid[]
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_name text;
  organization_id_item uuid;
begin
  if not private.user_has_role('admin') then
    raise exception 'administrator role required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'full name is required' using errcode = '23514';
  end if;
  if p_profile_id = (select auth.uid()) and
     (not coalesce(p_is_active, false) or not coalesce('admin' = any(p_roles), false)) then
    raise exception 'you cannot remove your own active administrator access' using errcode = '23514';
  end if;

  update public.profiles set full_name = trim(p_full_name), is_active = p_is_active where id = p_profile_id;
  if not found then raise exception 'profile was not found' using errcode = '23514'; end if;

  delete from public.user_roles where profile_id = p_profile_id;
  foreach role_name in array coalesce(p_roles, array[]::text[]) loop
    if role_name not in ('admin', 'user', 'executive', 'staff') then
      raise exception 'invalid application role' using errcode = '22023';
    end if;
    insert into public.user_roles (profile_id, role, organization_id, created_by)
    values (p_profile_id, role_name::public.app_role, null, (select auth.uid()));
  end loop;

  delete from public.user_organization_scopes where profile_id = p_profile_id;
  foreach organization_id_item in array coalesce(p_organization_ids, array[]::uuid[]) loop
    insert into public.user_organization_scopes (profile_id, organization_id, created_by)
    values (p_profile_id, organization_id_item, (select auth.uid()));
  end loop;
  return true;
end;
$$;

revoke all on function public.admin_update_user_access(uuid, text, boolean, text[], uuid[]) from public, anon;
grant execute on function public.admin_update_user_access(uuid, text, boolean, text[], uuid[]) to authenticated;

commit;
