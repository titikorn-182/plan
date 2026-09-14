begin;

insert into public.organizations (code, name_th, organization_type, is_active)
select
  'SEC-AUDIOVISUAL',
  'สำนักงานเลขานุการ-งานโสตทัศนศึกษา',
  'secretariat_division',
  true
where not exists (
  select 1
  from public.organizations
  where name_th = 'สำนักงานเลขานุการ-งานโสตทัศนศึกษา'
)
on conflict (code) do update
set
  name_th = excluded.name_th,
  organization_type = excluded.organization_type,
  is_active = true,
  updated_at = now();

commit;
