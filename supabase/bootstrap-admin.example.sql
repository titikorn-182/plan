-- 1) Create the user in Authentication > Users first.
-- 2) Replace the email below with that user's real email, then run this file once.

with target as (
  select id from public.profiles where lower(email) = lower('replace-with-admin@university.ac.th')
)
insert into public.user_roles (profile_id, role, organization_id, created_by)
select id, 'admin', null, id from target
on conflict (profile_id, role, organization_id) do update set active_until = null;

with target as (
  select id from public.profiles where lower(email) = lower('replace-with-admin@university.ac.th')
)
insert into public.user_organization_scopes (profile_id, organization_id, created_by)
select id, '10000000-0000-0000-0000-000000000001', id from target
on conflict (profile_id, organization_id) do update set active_until = null;
