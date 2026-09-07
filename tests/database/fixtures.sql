-- Disposable local/CI data only. These accounts must never be created remotely.
set search_path = public, extensions;
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_user_meta_data, raw_app_meta_data, aud, role,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  created_at, updated_at
)
select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000',
  username || '@example.test', crypt('Local-Test-Only-2026!', gen_salt('bf')),
  now(), jsonb_build_object('full_name', 'Test ' || username),
  '{"provider":"email","providers":["email"]}'::jsonb,
  'authenticated', 'authenticated', '', '', '', '', now(), now()
from (values (1, 'admin'), (2, 'user'), (3, 'executive'), (4, 'staff'),
  (5, 'other-staff'), (6, 'outside'), (7, 'inactive')) as account(n, username);

insert into auth.identities (id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at)
select id, id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now() from auth.users where email like '%@example.test';

insert into public.organizations (id, code, name_th, organization_type) values
  ('20000000-0000-4000-8000-000000000001', 'TEST-A', 'หน่วยงานทดสอบ A', 'faculty'),
  ('20000000-0000-4000-8000-000000000002', 'TEST-B', 'หน่วยงานทดสอบ B', 'faculty');

insert into public.user_roles (profile_id, role)
select id, (case split_part(email, '@', 1)
  when 'admin' then 'admin' when 'user' then 'user'
  when 'executive' then 'executive' else 'staff' end)::public.app_role
from public.profiles where email like '%@example.test';

insert into public.user_organization_scopes (profile_id, organization_id)
select id, case when email = 'outside@example.test'
  then '20000000-0000-4000-8000-000000000002'::uuid
  else '20000000-0000-4000-8000-000000000001'::uuid end
from public.profiles where email like '%@example.test';
update public.profiles set is_active = false where email = 'inactive@example.test';

insert into public.fiscal_years (id, buddhist_year, label, starts_on, ends_on) values
  ('30000000-0000-4000-8000-000000000001', 2570, 'ปีทดสอบ 2570', '2026-10-01', '2027-09-30');
insert into public.budget_cycles (id, fiscal_year_id, name, opens_at, closes_at) values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
   'รอบทดสอบ', now() - interval '1 year', now() + interval '1 year');

insert into public.projects (id, code, title_th, fiscal_year_id, organization_id,
  owner_id, coordinator_id, owner_name, coordinator_name, project_type, approved_budget,
  starts_on, ends_on, created_by)
select ('50000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
  'TEST-P' || n, 'โครงการทดสอบ ' || n, '30000000-0000-4000-8000-000000000001',
  ('20000000-0000-4000-8000-' || lpad(org::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid,
  ('10000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid,
  'Test owner', 'Test coordinator', 'โครงการทดสอบ', 1000,
  '2026-10-01', '2027-09-30',
  ('10000000-0000-4000-8000-' || lpad(owner::text, 12, '0'))::uuid
from (values (1, 1, 4), (2, 1, 5), (3, 2, 6)) as project(n, org, owner);

insert into public.budget_requests (id, code, fiscal_year_id, budget_cycle_id,
  organization_id, owner_id, owner_name, coordinator_name, title_th, category,
  project_type, rationale, requested_amount, created_by)
values ('60000000-0000-4000-8000-000000000001', 'TEST-BR1',
  '30000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004',
  'Test staff', 'Test staff', 'คำของบประมาณทดสอบ', 'ดำเนินงาน', 'โครงการทดสอบ',
  'เหตุผลประกอบการทดสอบการส่งคำของบประมาณเพื่ออนุมัติ', 1000,
  '10000000-0000-4000-8000-000000000004');

insert into public.kpi_definitions (id, code, framework, framework_version, fiscal_year_id,
  organization_id, owner_id, owner_name, name, calculation_method, unit, target)
values ('70000000-0000-4000-8000-000000000001', 'TEST-KPI', 'EdPEx', 'test',
  '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004', 'Test staff', 'ตัวชี้วัดทดสอบ', 'ผล / เป้า', 'ร้อยละ', 100);
insert into public.kpi_results (id, kpi_definition_id, fiscal_year_id, organization_id, assignee_id)
values ('80000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004');
