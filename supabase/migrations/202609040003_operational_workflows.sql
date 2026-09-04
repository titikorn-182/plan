begin;

grant update on table public.profiles to authenticated;

create policy profiles_admin_update on public.profiles for update to authenticated
  using (private.user_has_role('admin'))
  with check (private.user_has_role('admin'));

create or replace function private.pick_reviewer(target_organization_id uuid, target_role public.app_role)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select candidate.profile_id
  from (
    select ur.profile_id, 0 as rank
    from public.user_roles ur
    join public.profiles p on p.id = ur.profile_id and p.is_active
    left join public.user_organization_scopes scope
      on scope.profile_id = ur.profile_id
      and scope.organization_id = target_organization_id
      and scope.active_from <= now()
      and (scope.active_until is null or scope.active_until > now())
    where ur.role = target_role
      and ur.active_from <= now()
      and (ur.active_until is null or ur.active_until > now())
      and (ur.organization_id is null or ur.organization_id = target_organization_id or scope.id is not null)
    union all
    select ur.profile_id, 1 as rank
    from public.user_roles ur
    join public.profiles p on p.id = ur.profile_id and p.is_active
    where ur.role = 'admin'
      and ur.active_from <= now()
      and (ur.active_until is null or ur.active_until > now())
  ) candidate
  order by candidate.rank, candidate.profile_id
  limit 1;
$$;

create or replace function private.notify_user(
  target_profile_id uuid,
  target_entity_type text,
  target_entity_id uuid,
  notification_title text,
  notification_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_profile_id is not null and target_profile_id <> (select auth.uid()) then
    insert into public.notifications (recipient_id, entity_type, entity_id, title, body)
    values (target_profile_id, target_entity_type, target_entity_id, notification_title, notification_body);
  end if;
end;
$$;

create or replace function private.entity_has_pending_task(target_type text, target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.approval_tasks
    where entity_type = target_type and entity_id = target_id and status = 'pending'
  );
$$;

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated
  using (
    status = 'proposed'
    and not private.entity_has_pending_task('project', id)
    and (private.can_manage_org(organization_id) or (private.user_has_role('staff') and owner_id = (select auth.uid())))
  )
  with check (
    status = 'proposed'
    and (private.can_manage_org(organization_id) or (private.user_has_role('staff') and owner_id = (select auth.uid())))
  );

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
      when 'kpi_result' then update public.kpi_results set status = 'verified', verified_at = now(), verified_by = (select auth.uid()) where id = task_row.entity_id;
      else null;
    end case;
    perform private.notify_user(owner_id, task_row.entity_type, task_row.entity_id, concat('อนุมัติแล้ว: ', entity_code), entity_title);
  elsif p_decision = 'revision_required' then
    case task_row.entity_type
      when 'project' then update public.projects set health = 'watch' where id = task_row.entity_id;
      when 'budget_request' then update public.budget_requests set status = 'revision_required' where id = task_row.entity_id;
      when 'quarterly_report' then update public.quarterly_reports set status = 'revision_required' where id = task_row.entity_id;
      when 'kpi_result' then update public.kpi_results set status = 'revision_required' where id = task_row.entity_id;
      else null;
    end case;
    perform private.notify_user(owner_id, task_row.entity_type, task_row.entity_id, concat('ส่งกลับแก้ไข: ', entity_code), coalesce(p_comment, entity_title));
  else
    case task_row.entity_type
      when 'project' then update public.projects set health = 'at_risk' where id = task_row.entity_id;
      when 'budget_request' then update public.budget_requests set status = 'rejected' where id = task_row.entity_id;
      when 'quarterly_report' then update public.quarterly_reports set status = 'revision_required' where id = task_row.entity_id;
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

create or replace function private.guard_disbursement_budget()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved numeric(18,2);
  existing_total numeric(18,2);
begin
  select p.approved_budget into approved
  from public.projects p
  where p.id = new.project_id
  for update;
  if approved is null then
    raise exception 'project was not found' using errcode = '23514';
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

create or replace function private.sync_project_disbursed_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_project uuid;
begin
  target_project := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
  update public.projects
  set disbursed_amount = (
    select coalesce(sum(d.amount), 0) from public.disbursements d where d.project_id = target_project
  ),
  disbursement_state = coalesce((
    select d.status from public.disbursements d
    where d.project_id = target_project
    order by d.disbursed_on desc, d.created_at desc limit 1
  ), 'recorded'::public.disbursement_status)
  where id = target_project;
  return case when tg_op = 'DELETE' then old else new end;
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
      select count(*) from public.attachments a where a.entity_type = target_type and a.entity_id = target_id and a.archived_at is null
    ) where id = target_id;
  elsif target_type = 'kpi_result' then
    update public.kpi_results set evidence_count = (
      select count(*) from public.attachments a where a.entity_type = target_type and a.entity_id = target_id and a.archived_at is null
    ) where id = target_id;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists guard_disbursement_budget on public.disbursements;
create trigger guard_disbursement_budget before insert or update on public.disbursements
  for each row execute function private.guard_disbursement_budget();

drop trigger if exists sync_project_disbursed_amount on public.disbursements;
create trigger sync_project_disbursed_amount after insert or update or delete on public.disbursements
  for each row execute function private.sync_project_disbursed_amount();

drop trigger if exists sync_evidence_count on public.attachments;
create trigger sync_evidence_count after insert or update or delete on public.attachments
  for each row execute function private.sync_evidence_count();

update public.projects p set
  disbursed_amount = (select coalesce(sum(d.amount), 0) from public.disbursements d where d.project_id = p.id),
  disbursement_state = coalesce((select d.status from public.disbursements d where d.project_id = p.id order by d.disbursed_on desc, d.created_at desc limit 1), 'recorded'::public.disbursement_status);
update public.quarterly_reports r set evidence_count = (
  select count(*) from public.attachments a where a.entity_type = 'quarterly_report' and a.entity_id = r.id and a.archived_at is null
);
update public.kpi_results kr set evidence_count = (
  select count(*) from public.attachments a where a.entity_type = 'kpi_result' and a.entity_id = kr.id and a.archived_at is null
);

drop trigger if exists audit_approval_tasks on public.approval_tasks;
create trigger audit_approval_tasks after insert or update or delete on public.approval_tasks
  for each row execute function private.audit_record_change('approval_task');
drop trigger if exists audit_attachments on public.attachments;
create trigger audit_attachments after insert or update or delete on public.attachments
  for each row execute function private.audit_record_change('attachment');
drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after update on public.profiles
  for each row execute function private.audit_record_change('profile');
drop trigger if exists audit_user_roles on public.user_roles;
create trigger audit_user_roles after insert or update or delete on public.user_roles
  for each row execute function private.audit_record_change('user_role');
drop trigger if exists audit_user_scopes on public.user_organization_scopes;
create trigger audit_user_scopes after insert or update or delete on public.user_organization_scopes
  for each row execute function private.audit_record_change('user_organization_scope');

create or replace function private.try_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function private.storage_object_access(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_access_entity(
    split_part(object_name, '/', 2),
    private.try_uuid(split_part(object_name, '/', 3)),
    private.try_uuid(split_part(object_name, '/', 1))
  );
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  20971520,
  array['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy evidence_objects_select on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and private.storage_object_access(name));
create policy evidence_objects_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and private.storage_object_access(name)
    and split_part(name, '/', 4) = (select auth.uid())::text
  );
create policy evidence_objects_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'evidence'
    and private.storage_object_access(name)
    and (private.user_has_role('admin') or split_part(name, '/', 4) = (select auth.uid())::text)
  );

create or replace function public.review_evidence(
  p_attachment_id uuid,
  p_verified boolean,
  p_comment text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  evidence_row public.attachments%rowtype;
begin
  select * into evidence_row from public.attachments where id = p_attachment_id for update;
  if evidence_row.id is null or evidence_row.archived_at is not null then
    raise exception 'evidence was not found' using errcode = '23514';
  end if;
  if not private.can_manage_org(evidence_row.organization_id) then
    raise exception 'you are not allowed to review this evidence' using errcode = '42501';
  end if;
  if not p_verified and char_length(trim(coalesce(p_comment, ''))) < 5 then
    raise exception 'a reason of at least 5 characters is required' using errcode = '23514';
  end if;

  update public.attachments set is_verified = p_verified where id = p_attachment_id;
  if nullif(trim(p_comment), '') is not null then
    insert into public.comments (organization_id, entity_type, entity_id, body, created_by)
    values (evidence_row.organization_id, evidence_row.entity_type, evidence_row.entity_id, trim(p_comment), (select auth.uid()));
  end if;
  perform private.notify_user(
    evidence_row.uploaded_by,
    evidence_row.entity_type,
    evidence_row.entity_id,
    case when p_verified then 'หลักฐานผ่านการตรวจสอบ' else 'หลักฐานต้องแก้ไข' end,
    coalesce(nullif(trim(p_comment), ''), evidence_row.file_name)
  );
  return true;
end;
$$;

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
  if p_profile_id = (select auth.uid()) and (not p_is_active or not ('admin' = any(p_roles))) then
    raise exception 'you cannot remove your own active administrator access' using errcode = '23514';
  end if;

  update public.profiles set full_name = trim(p_full_name), is_active = p_is_active where id = p_profile_id;
  if not found then raise exception 'profile was not found' using errcode = '23514'; end if;

  delete from public.user_roles where profile_id = p_profile_id;
  foreach role_name in array coalesce(p_roles, array[]::text[]) loop
    if role_name not in ('admin', 'user', 'executive', 'staff') then
      raise exception 'invalid application role' using errcode = '22023';
    end if;
    insert into public.user_roles (profile_id, role, organization_id, granted_by)
    values (p_profile_id, role_name::public.app_role, null, (select auth.uid()));
  end loop;

  delete from public.user_organization_scopes where profile_id = p_profile_id;
  foreach organization_id_item in array coalesce(p_organization_ids, array[]::uuid[]) loop
    insert into public.user_organization_scopes (profile_id, organization_id, granted_by)
    values (p_profile_id, organization_id_item, (select auth.uid()));
  end loop;
  return true;
end;
$$;

create view public.workflow_inbox with (security_invoker = true) as
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
  coalesce(b.code, p.code, kd.code, 'REPORT') as business_id,
  coalesce(b.title_th, p.title_th, report_project.title_th, kd.name, 'รายการรอพิจารณา') as title
from public.approval_tasks t
join public.organizations o on o.id = t.organization_id
left join public.budget_requests b on t.entity_type = 'budget_request' and b.id = t.entity_id
left join public.projects p on t.entity_type = 'project' and p.id = t.entity_id
left join public.quarterly_reports qr on t.entity_type = 'quarterly_report' and qr.id = t.entity_id
left join public.projects report_project on report_project.id = qr.project_id
left join public.kpi_results kr on t.entity_type = 'kpi_result' and kr.id = t.entity_id
left join public.kpi_definitions kd on kd.id = kr.kpi_definition_id;

create or replace view public.project_register with (security_invoker = true) as
select p.id, p.code, p.title_th as title, o.name_th as unit, p.owner_name as owner,
  p.approved_budget as budget, p.disbursed_amount as spent, p.progress, p.health::text as health,
  p.status::text as status, p.ends_on as due, p.organization_id, p.updated_at, p.version,
  private.entity_has_pending_task('project', p.id) as has_pending_approval
from public.projects p
join public.organizations o on o.id = p.organization_id
where p.archived_at is null;

create view public.evidence_register with (security_invoker = true) as
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
  coalesce(b.code, p.code, report_project.code, kd.code, 'รายการ') as business_id,
  coalesce(b.title_th, p.title_th, report_project.title_th, kd.name, 'หลักฐานประกอบ') as title
from public.attachments a
join public.organizations o on o.id = a.organization_id
left join public.budget_requests b on a.entity_type = 'budget_request' and b.id = a.entity_id
left join public.projects p on a.entity_type = 'project' and p.id = a.entity_id
left join public.quarterly_reports qr on a.entity_type = 'quarterly_report' and qr.id = a.entity_id
left join public.projects report_project on report_project.id = qr.project_id
left join public.kpi_results kr on a.entity_type = 'kpi_result' and kr.id = a.entity_id
left join public.kpi_definitions kd on kd.id = kr.kpi_definition_id
where a.archived_at is null;

grant select on table public.workflow_inbox, public.evidence_register, public.project_register to authenticated;

revoke all on function private.pick_reviewer(uuid, public.app_role) from public, anon, authenticated;
revoke all on function private.notify_user(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function private.entity_has_pending_task(text, uuid) from public, anon;
grant execute on function private.entity_has_pending_task(text, uuid) to authenticated;
revoke all on function private.guard_disbursement_budget() from public, anon, authenticated;
revoke all on function private.sync_project_disbursed_amount() from public, anon, authenticated;
revoke all on function private.sync_evidence_count() from public, anon, authenticated;
revoke all on function private.try_uuid(text) from public, anon, authenticated;
revoke all on function private.storage_object_access(text) from public, anon;
grant execute on function private.storage_object_access(text) to authenticated;
revoke all on function public.submit_entity_for_approval(text, uuid, text) from public, anon;
grant execute on function public.submit_entity_for_approval(text, uuid, text) to authenticated;
revoke all on function public.act_on_approval_task(uuid, text, text) from public, anon;
grant execute on function public.act_on_approval_task(uuid, text, text) to authenticated;
revoke all on function public.review_evidence(uuid, boolean, text) from public, anon;
grant execute on function public.review_evidence(uuid, boolean, text) to authenticated;
revoke all on function public.admin_update_user_access(uuid, text, boolean, text[], uuid[]) from public, anon;
grant execute on function public.admin_update_user_access(uuid, text, boolean, text[], uuid[]) to authenticated;

commit;
