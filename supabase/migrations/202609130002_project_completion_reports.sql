begin;

create table public.project_completion_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  fiscal_year_id uuid not null references public.fiscal_years(id),
  organization_id uuid not null references public.organizations(id),
  due_at date not null,
  status public.report_status not null default 'draft',
  evidence_count integer not null default 0 check (evidence_count >= 0),
  actual_results text,
  objective_achievement text,
  indicator_results text,
  beneficiary_summary text,
  expense_summary text,
  problems text,
  lessons_learned text,
  follow_up_plan text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1
);

create index project_completion_reports_org_due_idx
  on public.project_completion_reports(organization_id, due_at, status);

create or replace function private.set_project_completion_report_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_project public.projects%rowtype;
begin
  select * into source_project
  from public.projects
  where id = new.project_id and archived_at is null;

  if source_project.id is null or source_project.ends_on is null then
    raise exception 'project with an end date is required' using errcode = '23514';
  end if;
  if source_project.status not in ('active', 'on_hold', 'completed') then
    raise exception 'project is not ready for a completion report' using errcode = '23514';
  end if;

  new.organization_id := source_project.organization_id;
  new.fiscal_year_id := source_project.fiscal_year_id;
  new.due_at := source_project.ends_on + 15;
  return new;
end;
$$;

revoke all on function private.set_project_completion_report_scope() from public, anon, authenticated;

create trigger set_project_completion_report_scope
  before insert or update of project_id, organization_id, fiscal_year_id, due_at
  on public.project_completion_reports
  for each row execute function private.set_project_completion_report_scope();

create trigger touch_project_completion_reports
  before update on public.project_completion_reports
  for each row execute function private.touch_record();

create trigger audit_project_completion_reports
  after insert or update or delete on public.project_completion_reports
  for each row execute function private.audit_record_change('project_completion_report');

alter table public.project_completion_reports enable row level security;

grant select, insert, update, delete on public.project_completion_reports to authenticated;

create policy project_completion_reports_select
  on public.project_completion_reports for select to authenticated
  using (private.can_access_project(project_id));

create policy project_completion_reports_insert
  on public.project_completion_reports for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and private.current_app_role() is not null
    and private.can_access_project(project_id)
  );

create policy project_completion_reports_update
  on public.project_completion_reports for update to authenticated
  using (status in ('draft', 'revision_required') and private.can_access_project(project_id))
  with check (private.can_access_project(project_id));

create policy project_completion_reports_admin_delete
  on public.project_completion_reports for delete to authenticated
  using (private.user_has_role('admin') and status = 'draft');

create or replace function private.can_access_entity(
  target_type text,
  target_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case target_type
    when 'budget_request' then exists (
      select 1 from public.budget_requests b
      where b.id = target_id and (
        private.can_view_org(b.organization_id)
        or (private.current_app_role() is not null and (b.owner_id = (select auth.uid()) or b.coordinator_id = (select auth.uid())))
      )
    )
    when 'project' then private.can_access_project(target_id)
    when 'quarterly_report' then exists (
      select 1 from public.quarterly_reports r
      where r.id = target_id and private.can_access_project(r.project_id)
    )
    when 'project_completion_report' then exists (
      select 1 from public.project_completion_reports r
      where r.id = target_id and private.can_access_project(r.project_id)
    )
    when 'kpi_result' then exists (
      select 1 from public.kpi_results kr
      join public.kpi_definitions kd on kd.id = kr.kpi_definition_id
      where kr.id = target_id and (
        private.can_view_org(kr.organization_id)
        or (private.current_app_role() is not null and (kr.assignee_id = (select auth.uid()) or kd.owner_id = (select auth.uid())))
      )
    )
    else private.can_view_org(target_organization_id)
  end;
$$;

create or replace function private.sync_evidence_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_type text;
  target_id uuid;
begin
  target_type := case when tg_op = 'DELETE' then old.entity_type else new.entity_type end;
  target_id := case when tg_op = 'DELETE' then old.entity_id else new.entity_id end;
  if target_type = 'quarterly_report' then
    update public.quarterly_reports set evidence_count = (
      select count(*) from public.attachments a
      where a.entity_type = target_type and a.entity_id = target_id and a.archived_at is null
    ) where id = target_id;
  elsif target_type = 'project_completion_report' then
    update public.project_completion_reports set evidence_count = (
      select count(*) from public.attachments a
      where a.entity_type = target_type and a.entity_id = target_id and a.archived_at is null
    ) where id = target_id;
  elsif target_type = 'kpi_result' then
    update public.kpi_results set evidence_count = (
      select count(*) from public.attachments a
      where a.entity_type = target_type and a.entity_id = target_id and a.archived_at is null
    ) where id = target_id;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.submit_entity_for_approval(
  p_entity_type text,
  p_entity_id uuid,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_role public.app_role;
  required_role public.app_role;
  target_org uuid;
  target_owner uuid;
  target_title text;
  target_code text;
  target_status text;
  reviewer_id uuid;
  task_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  active_role := private.current_app_role();
  if active_role is null then
    raise exception 'active application role required' using errcode = '42501';
  end if;

  case p_entity_type
    when 'project' then
      select p.organization_id, coalesce(p.owner_id, p.created_by), p.title_th, p.code, p.status::text
        into target_org, target_owner, target_title, target_code, target_status
      from public.projects p
      where p.id = p_entity_id and p.archived_at is null and private.can_access_project(p.id);
      if target_status <> 'proposed' then
        raise exception 'only proposed projects can be submitted' using errcode = '23514';
      end if;
    when 'quarterly_report' then
      select r.organization_id, coalesce(p.owner_id, r.created_by), p.title_th, p.code, r.status::text
        into target_org, target_owner, target_title, target_code, target_status
      from public.quarterly_reports r
      join public.projects p on p.id = r.project_id
      where r.id = p_entity_id and private.can_access_project(r.project_id);
      if target_status not in ('draft', 'revision_required') then
        raise exception 'only draft or revision-required reports can be submitted' using errcode = '23514';
      end if;
      update public.quarterly_reports
        set status = 'submitted', submitted_at = now(), updated_by = (select auth.uid())
        where id = p_entity_id;
    when 'project_completion_report' then
      select r.organization_id, coalesce(p.owner_id, r.created_by), p.title_th, p.code, r.status::text
        into target_org, target_owner, target_title, target_code, target_status
      from public.project_completion_reports r
      join public.projects p on p.id = r.project_id
      where r.id = p_entity_id and private.can_access_project(r.project_id);
      if target_status not in ('draft', 'revision_required') then
        raise exception 'only draft or revision-required completion reports can be submitted' using errcode = '23514';
      end if;
      update public.project_completion_reports
        set status = 'submitted', submitted_at = now(), updated_by = (select auth.uid())
        where id = p_entity_id;
    when 'kpi_result' then
      select kr.organization_id, coalesce(kr.assignee_id, kr.created_by), kd.name, kd.code, kr.status::text
        into target_org, target_owner, target_title, target_code, target_status
      from public.kpi_results kr
      join public.kpi_definitions kd on kd.id = kr.kpi_definition_id
      where kr.id = p_entity_id
        and private.can_access_entity('kpi_result', kr.id, kr.organization_id);
      if target_status not in ('not_started', 'draft', 'revision_required') then
        raise exception 'only editable KPI results can be submitted' using errcode = '23514';
      end if;
      update public.kpi_results
        set status = 'submitted', submitted_at = now(), updated_by = (select auth.uid())
        where id = p_entity_id;
    when 'budget_request' then
      select b.organization_id, coalesce(b.owner_id, b.created_by), b.title_th, b.code, b.status::text
        into target_org, target_owner, target_title, target_code, target_status
      from public.budget_requests b
      where b.id = p_entity_id
        and private.can_access_entity('budget_request', b.id, b.organization_id);
      if target_status not in ('submitted', 'under_review') then
        raise exception 'budget request is not ready for approval' using errcode = '23514';
      end if;
    else
      raise exception 'unsupported entity type' using errcode = '22023';
  end case;

  if target_org is null then
    raise exception 'entity was not found or is outside your scope' using errcode = '42501';
  end if;

  required_role := case when active_role = 'staff' then 'user'::public.app_role else 'executive'::public.app_role end;
  reviewer_id := private.pick_reviewer(target_org, required_role);

  update public.approval_tasks
    set status = 'cancelled', acted_at = now(), comment = 'แทนที่ด้วยการส่งอนุมัติครั้งใหม่'
    where entity_type = p_entity_type and entity_id = p_entity_id and status = 'pending';

  insert into public.approval_tasks (
    organization_id, entity_type, entity_id, assignee_id, required_role, status, due_at, comment
  ) values (
    target_org, p_entity_type, p_entity_id, reviewer_id, required_role, 'pending', now() + interval '7 days', nullif(trim(p_comment), '')
  ) returning id into task_id;

  perform private.notify_user(
    reviewer_id,
    p_entity_type,
    p_entity_id,
    concat('มีรายการรอ', case when required_role = 'executive' then 'อนุมัติ' else 'ตรวจสอบ' end, ': ', target_code),
    concat(target_title, ' ถูกส่งเข้าสู่กระบวนการพิจารณา')
  );

  return task_id;
end;
$$;

create or replace function public.act_on_approval_task(
  p_task_id uuid,
  p_decision text,
  p_comment text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_row public.approval_tasks%rowtype;
  next_reviewer uuid;
  owner_id uuid;
  entity_title text;
  entity_code text;
begin
  if p_decision not in ('approved', 'revision_required', 'rejected') then
    raise exception 'invalid approval decision' using errcode = '22023';
  end if;
  if p_decision in ('revision_required', 'rejected') and char_length(trim(coalesce(p_comment, ''))) < 5 then
    raise exception 'a reason of at least 5 characters is required' using errcode = '23514';
  end if;

  select * into task_row
  from public.approval_tasks
  where id = p_task_id
  for update;

  if task_row.id is null or task_row.status <> 'pending' then
    raise exception 'approval task is no longer pending' using errcode = '23514';
  end if;
  if not private.user_has_role('admin') and not (
    private.user_has_role(task_row.required_role)
    and private.can_view_org(task_row.organization_id)
    and (task_row.assignee_id is null or task_row.assignee_id = (select auth.uid()))
  ) then
    raise exception 'you are not allowed to act on this approval task' using errcode = '42501';
  end if;

  update public.approval_tasks
    set status = p_decision, acted_at = now(), comment = nullif(trim(p_comment), '')
    where id = p_task_id;

  case task_row.entity_type
    when 'project' then
      select coalesce(p.owner_id, p.created_by), p.title_th, p.code into owner_id, entity_title, entity_code
      from public.projects p where p.id = task_row.entity_id;
    when 'quarterly_report' then
      select coalesce(p.owner_id, r.created_by), p.title_th, p.code into owner_id, entity_title, entity_code
      from public.quarterly_reports r join public.projects p on p.id = r.project_id where r.id = task_row.entity_id;
    when 'project_completion_report' then
      select coalesce(p.owner_id, r.created_by), p.title_th, p.code into owner_id, entity_title, entity_code
      from public.project_completion_reports r join public.projects p on p.id = r.project_id where r.id = task_row.entity_id;
    when 'kpi_result' then
      select coalesce(kr.assignee_id, kr.created_by), kd.name, kd.code into owner_id, entity_title, entity_code
      from public.kpi_results kr join public.kpi_definitions kd on kd.id = kr.kpi_definition_id where kr.id = task_row.entity_id;
    when 'budget_request' then
      select coalesce(b.owner_id, b.created_by), b.title_th, b.code into owner_id, entity_title, entity_code
      from public.budget_requests b where b.id = task_row.entity_id;
    else
      raise exception 'unsupported entity type' using errcode = '22023';
  end case;

  if p_decision = 'approved' and task_row.required_role = 'user' then
    case task_row.entity_type
      when 'budget_request' then update public.budget_requests set status = 'pending_approval' where id = task_row.entity_id;
      when 'quarterly_report' then update public.quarterly_reports set status = 'under_review' where id = task_row.entity_id;
      when 'project_completion_report' then update public.project_completion_reports set status = 'under_review' where id = task_row.entity_id;
      else null;
    end case;

    next_reviewer := private.pick_reviewer(task_row.organization_id, 'executive');
    insert into public.approval_tasks (organization_id, entity_type, entity_id, assignee_id, required_role, status, due_at, comment)
    values (task_row.organization_id, task_row.entity_type, task_row.entity_id, next_reviewer, 'executive', 'pending', now() + interval '5 days', 'ผ่านการตรวจสอบระดับหน่วยงาน');
    perform private.notify_user(next_reviewer, task_row.entity_type, task_row.entity_id, concat('มีรายการรออนุมัติ: ', entity_code), entity_title);
  elsif p_decision = 'approved' then
    case task_row.entity_type
      when 'project' then update public.projects set status = 'active', health = 'normal' where id = task_row.entity_id;
      when 'budget_request' then update public.budget_requests set status = 'approved', locked_at = now() where id = task_row.entity_id;
      when 'quarterly_report' then update public.quarterly_reports set status = 'approved', verified_at = now(), verified_by = (select auth.uid()) where id = task_row.entity_id;
      when 'project_completion_report' then
        update public.project_completion_reports set status = 'approved', verified_at = now(), verified_by = (select auth.uid()) where id = task_row.entity_id;
        update public.projects set status = 'completed', progress = 100, health = 'normal'
          where id = (select project_id from public.project_completion_reports where id = task_row.entity_id);
      when 'kpi_result' then update public.kpi_results set status = 'verified', verified_at = now(), verified_by = (select auth.uid()) where id = task_row.entity_id;
      else null;
    end case;
    perform private.notify_user(owner_id, task_row.entity_type, task_row.entity_id, concat('อนุมัติแล้ว: ', entity_code), entity_title);
  elsif p_decision = 'revision_required' then
    case task_row.entity_type
      when 'project' then update public.projects set health = 'watch' where id = task_row.entity_id;
      when 'budget_request' then update public.budget_requests set status = 'revision_required' where id = task_row.entity_id;
      when 'quarterly_report' then update public.quarterly_reports set status = 'revision_required' where id = task_row.entity_id;
      when 'project_completion_report' then update public.project_completion_reports set status = 'revision_required' where id = task_row.entity_id;
      when 'kpi_result' then update public.kpi_results set status = 'revision_required' where id = task_row.entity_id;
      else null;
    end case;
    perform private.notify_user(owner_id, task_row.entity_type, task_row.entity_id, concat('ส่งกลับแก้ไข: ', entity_code), coalesce(p_comment, entity_title));
  else
    case task_row.entity_type
      when 'project' then update public.projects set health = 'at_risk' where id = task_row.entity_id;
      when 'budget_request' then update public.budget_requests set status = 'rejected' where id = task_row.entity_id;
      when 'quarterly_report' then update public.quarterly_reports set status = 'revision_required' where id = task_row.entity_id;
      when 'project_completion_report' then update public.project_completion_reports set status = 'revision_required' where id = task_row.entity_id;
      when 'kpi_result' then update public.kpi_results set status = 'revision_required' where id = task_row.entity_id;
      else null;
    end case;
    perform private.notify_user(owner_id, task_row.entity_type, task_row.entity_id, concat('ไม่อนุมัติ: ', entity_code), coalesce(p_comment, entity_title));
  end if;

  if nullif(trim(p_comment), '') is not null then
    insert into public.comments (organization_id, entity_type, entity_id, body, created_by)
    values (task_row.organization_id, task_row.entity_type, task_row.entity_id, trim(p_comment), (select auth.uid()));
  end if;

  return true;
end;
$$;

create view public.project_completion_report_register with (security_invoker = true) as
select
  p.id as project_id,
  r.id,
  p.code as project_code,
  p.title_th as title,
  o.name_th as unit,
  fy.buddhist_year,
  p.ends_on,
  (p.ends_on + 15) as due_at,
  case
    when r.status = 'draft' and (now() at time zone 'Asia/Bangkok')::date > (p.ends_on + 15) then 'overdue'
    when r.id is null and (now() at time zone 'Asia/Bangkok')::date > (p.ends_on + 15) then 'overdue'
    when r.id is null then 'not_started'
    else r.status::text
  end as status,
  coalesce(r.evidence_count, 0) as evidence_count,
  r.submitted_at,
  r.updated_at,
  p.organization_id,
  p.fiscal_year_id,
  r.version
from public.projects p
join public.organizations o on o.id = p.organization_id
join public.fiscal_years fy on fy.id = p.fiscal_year_id
left join public.project_completion_reports r on r.project_id = p.id
where p.archived_at is null
  and p.ends_on is not null
  and p.status in ('active', 'on_hold', 'completed');

create or replace view public.workflow_inbox with (security_invoker = true) as
select
  t.id,
  t.entity_type,
  t.entity_id,
  t.organization_id,
  o.name_th as unit,
  t.assignee_id,
  t.required_role::text as required_role,
  t.status,
  t.due_at,
  t.acted_at,
  t.comment,
  t.created_at,
  coalesce(b.code, p.code, quarterly_project.code, completion_project.code, kd.code, 'REPORT') as business_id,
  coalesce(b.title_th, p.title_th, quarterly_project.title_th, completion_project.title_th, kd.name, 'รายการรอพิจารณา') as title
from public.approval_tasks t
join public.organizations o on o.id = t.organization_id
left join public.budget_requests b on t.entity_type = 'budget_request' and b.id = t.entity_id
left join public.projects p on t.entity_type = 'project' and p.id = t.entity_id
left join public.quarterly_reports qr on t.entity_type = 'quarterly_report' and qr.id = t.entity_id
left join public.projects quarterly_project on quarterly_project.id = qr.project_id
left join public.project_completion_reports pcr on t.entity_type = 'project_completion_report' and pcr.id = t.entity_id
left join public.projects completion_project on completion_project.id = pcr.project_id
left join public.kpi_results kr on t.entity_type = 'kpi_result' and kr.id = t.entity_id
left join public.kpi_definitions kd on kd.id = kr.kpi_definition_id;

create or replace view public.evidence_register with (security_invoker = true) as
select
  a.id,
  a.organization_id,
  o.name_th as unit,
  a.entity_type,
  a.entity_id,
  a.file_name,
  a.storage_path,
  a.mime_type,
  a.size_bytes,
  a.is_verified,
  a.uploaded_at,
  a.uploaded_by,
  coalesce(b.code, p.code, quarterly_project.code, completion_project.code, kd.code, 'รายการ') as business_id,
  coalesce(b.title_th, p.title_th, quarterly_project.title_th, completion_project.title_th, kd.name, 'หลักฐานประกอบ') as title
from public.attachments a
join public.organizations o on o.id = a.organization_id
left join public.budget_requests b on a.entity_type = 'budget_request' and b.id = a.entity_id
left join public.projects p on a.entity_type = 'project' and p.id = a.entity_id
left join public.quarterly_reports qr on a.entity_type = 'quarterly_report' and qr.id = a.entity_id
left join public.projects quarterly_project on quarterly_project.id = qr.project_id
left join public.project_completion_reports pcr on a.entity_type = 'project_completion_report' and pcr.id = a.entity_id
left join public.projects completion_project on completion_project.id = pcr.project_id
left join public.kpi_results kr on a.entity_type = 'kpi_result' and kr.id = a.entity_id
left join public.kpi_definitions kd on kd.id = kr.kpi_definition_id
where a.archived_at is null;

grant select on public.project_completion_report_register, public.workflow_inbox, public.evidence_register
  to authenticated;

revoke all on function public.submit_entity_for_approval(text, uuid, text) from public, anon;
grant execute on function public.submit_entity_for_approval(text, uuid, text) to authenticated;
revoke all on function public.act_on_approval_task(uuid, text, text) from public, anon;
grant execute on function public.act_on_approval_task(uuid, text, text) to authenticated;

commit;
