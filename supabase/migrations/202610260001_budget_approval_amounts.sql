begin;

-- Replace the old signature, keeping default arguments for non-budget callers.
-- Budget callers must provide the version they reviewed. Deploy the matching UI
-- with this migration; older budget decision forms will fail closed.
drop function public.act_on_approval_task(uuid, text, text);

create or replace function public.act_on_approval_task(
  p_task_id uuid,
  p_decision text,
  p_comment text default null,
  p_expected_budget_version integer default null,
  p_approved_amount numeric default null
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
  budget_row public.budget_requests%rowtype;
  approved_total numeric;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if length(coalesce(p_comment, '')) > 1000 then
    raise exception 'approval comment is too long' using errcode = '23514';
  end if;
  if p_decision is null or p_decision not in ('approved', 'revision_required', 'rejected') then
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


  if task_row.entity_type = 'budget_request' then
    select * into budget_row from public.budget_requests
      where id = task_row.entity_id for update;
    if budget_row.id is null or budget_row.archived_at is not null
      or task_row.required_role is null
      or budget_row.locked_at is not null
      or budget_row.organization_id <> task_row.organization_id
      or not (
        (task_row.required_role = 'user' and budget_row.status in ('submitted', 'under_review'))
        or (task_row.required_role = 'executive' and budget_row.status = 'pending_approval')
      ) then
      raise exception 'budget request is no longer awaiting this decision' using errcode = '23514';
    end if;
    if p_expected_budget_version is null or p_expected_budget_version <> budget_row.version then
      -- A stale form is a business conflict, never a retryable serialization failure.
      raise exception 'budget request changed; reload before deciding' using errcode = 'PT409';
    end if;
    if p_approved_amount is not null then
      if p_decision <> 'approved' or task_row.required_role <> 'executive' then
        raise exception 'only final approval may allocate money' using errcode = '23514';
      end if;
      if p_approved_amount < 0 or p_approved_amount > 999999999999
        or p_approved_amount <> round(p_approved_amount, 2) then
        raise exception 'approved budget amount is invalid' using errcode = '23514';
      end if;
    end if;
    approved_total := coalesce(p_approved_amount, budget_row.requested_amount);
    if p_decision = 'approved' and task_row.required_role = 'executive'
      and approved_total is distinct from budget_row.requested_amount
      and length(btrim(coalesce(p_comment, ''))) < 5 then
      raise exception 'budget amount adjustment requires a reason' using errcode = '23514';
    end if;
  elsif p_expected_budget_version is not null or p_approved_amount is not null then
    raise exception 'budget arguments require a budget task' using errcode = '22023';
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
      when 'budget_request' then
        update public.budget_requests set status = 'approved', locked_at = now(),
          approved_amount = approved_total,
          amendment_reason = case when approved_total is distinct from requested_amount
            then btrim(p_comment) else null end
        where id = task_row.entity_id;
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


revoke all on function public.act_on_approval_task(uuid,text,text,integer,numeric) from public, anon;
grant execute on function public.act_on_approval_task(uuid,text,text,integer,numeric) to authenticated;

create or replace function private.enforce_budget_request_content_edit()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  content_changed boolean;
  workflow_execution boolean;
begin
  if auth.uid() is null then return new; end if;
  if TG_OP = 'INSERT' then
    if new.approved_amount is not null or new.amendment_reason is not null then
      raise exception 'approved amendments require an existing approved request' using errcode = '42501';
    end if;
    return new;
  end if;
  -- Only the trusted function owner's execution context may make the initial
  -- allocation during the pending -> approved transition. Clients cannot forge
  -- current_user; no caller-settable session flag grants this exception.
  -- Other content edits keep the existing owner/admin rules below.
  workflow_execution := current_user = (select pg_catalog.pg_get_userbyid(p.proowner)
      from pg_catalog.pg_proc p where p.oid =
        'public.act_on_approval_task(uuid,text,text,integer,numeric)'::regprocedure);
  if old.status in ('submitted', 'under_review', 'pending_approval')
    and new.status is distinct from old.status and not workflow_execution then
    raise exception 'budget decisions require the approval workflow' using errcode = '42501';
  end if;
  if workflow_execution
    and old.status = 'pending_approval' and new.status = 'approved'
    and old.locked_at is null and old.archived_at is null
    and new.approved_amount is not null
    and (to_jsonb(new) - array['status','locked_at','approved_amount','amendment_reason','version','updated_at','updated_by'])
      is not distinct from
      (to_jsonb(old) - array['status','locked_at','approved_amount','amendment_reason','version','updated_at','updated_by']) then
    return new;
  end if;
  -- Workflow, archive/restore and audit metadata are not content edits.
  content_changed :=
    (to_jsonb(new) - array['status','submitted_at','locked_at','archived_at','progress','version','updated_at','updated_by'])
    is distinct from
    (to_jsonb(old) - array['status','submitted_at','locked_at','archived_at','progress','version','updated_at','updated_by']);
  if not content_changed then return new; end if;
  if old.archived_at is not null then
    raise exception 'archived request is not editable' using errcode = '42501';
  end if;
  if private.user_has_role('admin') then
    if old.status <> 'approved' or new.status <> 'approved' then
      raise exception 'admin may edit approved requests only' using errcode = '42501';
    end if;
    if row(new.id,new.code,new.organization_id,new.fiscal_year_id,new.budget_cycle_id,
      new.owner_id,new.coordinator_id,new.created_at,new.created_by,new.requested_amount,
      new.expense_breakdown,new.submitted_at,new.locked_at,new.archived_at)
      is distinct from
      row(old.id,old.code,old.organization_id,old.fiscal_year_id,old.budget_cycle_id,
      old.owner_id,old.coordinator_id,old.created_at,old.created_by,old.requested_amount,
      old.expense_breakdown,old.submitted_at,old.locked_at,old.archived_at)
      or (new.proposal_details->'expenseItems') is distinct from (old.proposal_details->'expenseItems')
      or (new.proposal_details->'organizationCode') is distinct from (old.proposal_details->'organizationCode')
      or (new.proposal_details->'organizationName') is distinct from (old.proposal_details->'organizationName') then
      raise exception 'approved request identity and original expenses are immutable' using errcode = '23514';
    end if;
    if nullif(btrim(new.amendment_reason), '') is null or length(new.amendment_reason) > 1000 then
      raise exception 'amendment reason required' using errcode = '23514';
    end if;
  elsif private.user_has_role('staff') and old.owner_id = auth.uid()
      and old.status in ('draft','revision_required') and old.locked_at is null then
    if new.approved_amount is distinct from old.approved_amount
      or new.amendment_reason is distinct from old.amendment_reason then
      raise exception 'only admin may amend approved amounts' using errcode = '42501';
    end if;
  else
    raise exception 'request content edit denied' using errcode = '42501';
  end if;
  return new;
end;
$$;


commit;
