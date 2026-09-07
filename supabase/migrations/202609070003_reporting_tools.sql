begin;

create table public.report_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 3 and 120),
  report_kind text not null check (report_kind in ('budget', 'projects', 'disbursements', 'kpi')),
  format text not null check (format in ('xlsx', 'pdf')),
  cadence text not null check (cadence in ('weekly', 'monthly', 'quarterly')),
  day_of_week smallint check (day_of_week between 1 and 7),
  day_of_month smallint check (day_of_month between 1 and 28),
  send_time time not null,
  timezone text not null default 'Asia/Bangkok',
  is_active boolean not null default true,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_schedules_cadence_day_check check (
    (cadence = 'weekly' and day_of_week is not null and day_of_month is null)
    or (cadence in ('monthly', 'quarterly') and day_of_month is not null and day_of_week is null)
  )
);

create index report_schedules_owner_active_idx
  on public.report_schedules(owner_id, is_active, created_at desc);

create trigger touch_report_schedules before update on public.report_schedules
  for each row execute function private.touch_timestamp();
create trigger audit_report_schedules after insert or update or delete on public.report_schedules
  for each row execute function private.audit_record_change('report_schedule');

alter table public.report_schedules enable row level security;
revoke all on table public.report_schedules from anon, authenticated;
grant select, insert, update, delete on table public.report_schedules to authenticated;

create policy report_schedules_select on public.report_schedules for select to authenticated
  using (owner_id = (select auth.uid()) or private.user_has_role('admin'));
create policy report_schedules_insert on public.report_schedules for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.current_app_role() is not null);
create policy report_schedules_update on public.report_schedules for update to authenticated
  using (owner_id = (select auth.uid()) or private.user_has_role('admin'))
  with check (owner_id = (select auth.uid()) or private.user_has_role('admin'));
create policy report_schedules_delete on public.report_schedules for delete to authenticated
  using (owner_id = (select auth.uid()) or private.user_has_role('admin'));

create or replace function private.guard_disbursement_budget()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved numeric(18,2);
  existing_total numeric(18,2);
  expected_org uuid;
  expected_year uuid;
  fiscal_start date;
  fiscal_end date;
begin
  if tg_op = 'UPDATE' and new.project_id <> old.project_id then
    raise exception 'disbursement project cannot be changed' using errcode = '23514';
  end if;

  select p.approved_budget, p.organization_id, p.fiscal_year_id, fy.starts_on, fy.ends_on
    into approved, expected_org, expected_year, fiscal_start, fiscal_end
  from public.projects p
  join public.fiscal_years fy on fy.id = p.fiscal_year_id
  where p.id = new.project_id
  for update of p;

  if approved is null then
    raise exception 'project was not found' using errcode = '23514';
  end if;
  if new.organization_id <> expected_org or new.fiscal_year_id <> expected_year then
    raise exception 'disbursement scope does not match project' using errcode = '23514';
  end if;
  if new.disbursed_on < fiscal_start or new.disbursed_on > fiscal_end then
    raise exception 'disbursement date is outside fiscal year' using errcode = '23514';
  end if;

  select coalesce(sum(amount), 0) into existing_total
  from public.disbursements
  where project_id = new.project_id and id <> coalesce(new.id, gen_random_uuid());
  if existing_total + new.amount > approved then
    raise exception 'disbursement exceeds approved project budget' using errcode = '23514';
  end if;

  update public.projects
    set disbursement_code = coalesce(disbursement_code, 'DIS' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)))
    where id = new.project_id;
  return new;
end;
$$;

revoke all on function private.guard_disbursement_budget() from public, anon, authenticated;

create or replace view public.project_register with (security_invoker = true) as
select p.id, p.code, p.title_th as title, o.name_th as unit, p.owner_name as owner,
  p.approved_budget as budget, p.disbursed_amount as spent, p.progress, p.health::text as health,
  p.status::text as status, p.ends_on as due, p.organization_id, p.updated_at, p.version,
  private.entity_has_pending_task('project', p.id) as has_pending_approval,
  p.fiscal_year_id, fy.buddhist_year
from public.projects p
join public.organizations o on o.id = p.organization_id
join public.fiscal_years fy on fy.id = p.fiscal_year_id
where p.archived_at is null;

create or replace view public.disbursement_register with (security_invoker = true) as
select p.id as project_id, p.disbursement_code as id, p.title_th as project, o.name_th as unit,
  p.approved_budget as approved,
  coalesce(sum(d.amount) filter (where d.quarter = 1), 0)::numeric(18,2) as q1,
  coalesce(sum(d.amount) filter (where d.quarter = 2), 0)::numeric(18,2) as q2,
  coalesce(sum(d.amount) filter (where d.quarter = 3), 0)::numeric(18,2) as q3,
  coalesce(sum(d.amount) filter (where d.quarter = 4), 0)::numeric(18,2) as q4,
  p.disbursement_target as target, p.disbursement_state::text as status, p.organization_id,
  p.fiscal_year_id, fy.buddhist_year
from public.projects p
join public.organizations o on o.id = p.organization_id
join public.fiscal_years fy on fy.id = p.fiscal_year_id
left join public.disbursements d on d.project_id = p.id
where p.disbursement_code is not null and p.archived_at is null
group by p.id, p.disbursement_code, p.title_th, o.name_th, p.approved_budget,
  p.disbursement_target, p.disbursement_state, p.organization_id, p.fiscal_year_id,
  fy.buddhist_year;

create or replace view public.kpi_register with (security_invoker = true) as
select kr.id, kd.code, kd.framework, kd.name, kd.owner_name as owner, kd.target,
  kr.actual, kd.unit, kr.result_state::text as status, kr.status::text as workflow_status,
  kr.evidence_count, kr.organization_id, kr.version, kr.fiscal_year_id, kr.quarter,
  fy.buddhist_year
from public.kpi_results kr
join public.kpi_definitions kd on kd.id = kr.kpi_definition_id
join public.fiscal_years fy on fy.id = kr.fiscal_year_id
where kd.is_active;

grant select on table public.project_register, public.disbursement_register, public.kpi_register
  to authenticated;

commit;
