begin;

-- Business identifiers belong to the database. PostgreSQL sequences are safe
-- when many requests are created at the same time, unlike timestamp suffixes
-- generated independently by application servers.
create sequence if not exists public.budget_request_code_seq;
create sequence if not exists public.project_code_seq;

select setval(
  'public.budget_request_code_seq',
  greatest(
    coalesce((
      select max(substring(code from 5)::bigint)
      from public.budget_requests
      where code ~ '^BR[0-9]{10}$'
    ), 0),
    1
  ),
  true
);

select setval(
  'public.project_code_seq',
  greatest(
    coalesce((
      select max(substring(code from 5)::bigint)
      from public.projects
      where code ~ '^PR[0-9]{10}$'
    ), 0),
    1
  ),
  true
);

revoke all on sequence public.budget_request_code_seq from public, anon, authenticated;
revoke all on sequence public.project_code_seq from public, anon, authenticated;

create or replace function private.assign_budget_request_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fiscal_year integer;
begin
  if nullif(trim(new.code), '') is not null then
    return new;
  end if;

  select fy.buddhist_year into fiscal_year
  from public.fiscal_years fy
  where fy.id = new.fiscal_year_id;

  if fiscal_year is null then
    raise exception 'fiscal year was not found' using errcode = '23503';
  end if;

  new.code := concat(
    'BR',
    right(fiscal_year::text, 2),
    lpad(nextval('public.budget_request_code_seq')::text, 8, '0')
  );
  return new;
end;
$$;

create or replace function private.assign_project_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fiscal_year integer;
begin
  if nullif(trim(new.code), '') is not null then
    return new;
  end if;

  select fy.buddhist_year into fiscal_year
  from public.fiscal_years fy
  where fy.id = new.fiscal_year_id;

  if fiscal_year is null then
    raise exception 'fiscal year was not found' using errcode = '23503';
  end if;

  new.code := concat(
    'PR',
    right(fiscal_year::text, 2),
    lpad(nextval('public.project_code_seq')::text, 8, '0')
  );
  return new;
end;
$$;

revoke all on function private.assign_budget_request_code() from public, anon, authenticated;
revoke all on function private.assign_project_code() from public, anon, authenticated;

create trigger assign_budget_request_code
  before insert on public.budget_requests
  for each row execute function private.assign_budget_request_code();

create trigger assign_project_code
  before insert on public.projects
  for each row execute function private.assign_project_code();

-- Saving and optional submission run inside one PostgreSQL transaction. An
-- approval-task failure therefore rolls the data change back as well.
create or replace function public.save_budget_request_transaction(
  p_id uuid,
  p_version integer,
  p_fiscal_year_id uuid,
  p_budget_cycle_id uuid,
  p_organization_id uuid,
  p_owner_name text,
  p_title_th text,
  p_category text,
  p_project_type text,
  p_rationale text,
  p_requested_amount numeric,
  p_expense_breakdown jsonb,
  p_proposal_details jsonb,
  p_submit boolean default false,
  p_comment text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  saved public.budget_requests%rowtype;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.budget_requests (
      fiscal_year_id,
      budget_cycle_id,
      organization_id,
      owner_id,
      coordinator_id,
      owner_name,
      coordinator_name,
      title_th,
      category,
      project_type,
      rationale,
      requested_amount,
      expense_breakdown,
      proposal_details,
      status,
      submitted_at,
      created_by,
      updated_by
    ) values (
      p_fiscal_year_id,
      p_budget_cycle_id,
      p_organization_id,
      actor_id,
      actor_id,
      p_owner_name,
      p_owner_name,
      p_title_th,
      p_category,
      p_project_type,
      p_rationale,
      p_requested_amount,
      p_expense_breakdown,
      p_proposal_details,
      'draft',
      null,
      actor_id,
      actor_id
    ) returning * into saved;
  else
    update public.budget_requests request
    set fiscal_year_id = p_fiscal_year_id,
        budget_cycle_id = p_budget_cycle_id,
        organization_id = p_organization_id,
        owner_name = p_owner_name,
        coordinator_name = p_owner_name,
        title_th = p_title_th,
        category = p_category,
        project_type = p_project_type,
        rationale = p_rationale,
        requested_amount = p_requested_amount,
        expense_breakdown = p_expense_breakdown,
        proposal_details = p_proposal_details,
        status = 'draft',
        submitted_at = null,
        updated_by = actor_id
    where request.id = p_id
      and request.version = p_version
      and request.status in ('draft', 'revision_required')
    returning request.* into saved;

    if saved.id is null then
      raise exception 'budget request changed or is no longer editable' using errcode = '40001';
    end if;
  end if;

  if p_submit then
    perform public.submit_budget_request_for_approval(saved.id, p_comment);
    select * into saved from public.budget_requests where id = saved.id;
  end if;

  return jsonb_build_object('id', saved.id, 'code', saved.code, 'version', saved.version);
end;
$$;

create or replace function public.save_project_transaction(
  p_id uuid,
  p_version integer,
  p_organization_id uuid,
  p_fiscal_year_id uuid,
  p_budget_request_id uuid,
  p_owner_name text,
  p_coordinator_name text,
  p_title_th text,
  p_project_type text,
  p_approved_budget numeric,
  p_disbursement_target numeric,
  p_starts_on date,
  p_ends_on date,
  p_proposal_details jsonb,
  p_submit boolean default false,
  p_comment text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  saved public.projects%rowtype;
begin
  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_id is null then
    insert into public.projects (
      organization_id,
      fiscal_year_id,
      budget_request_id,
      owner_id,
      coordinator_id,
      owner_name,
      coordinator_name,
      title_th,
      project_type,
      approved_budget,
      disbursement_target,
      starts_on,
      ends_on,
      proposal_details,
      status,
      health,
      created_by,
      updated_by
    ) values (
      p_organization_id,
      p_fiscal_year_id,
      p_budget_request_id,
      actor_id,
      actor_id,
      p_owner_name,
      p_coordinator_name,
      p_title_th,
      p_project_type,
      p_approved_budget,
      p_disbursement_target,
      p_starts_on,
      p_ends_on,
      p_proposal_details,
      'proposed',
      'normal',
      actor_id,
      actor_id
    ) returning * into saved;
  else
    update public.projects project
    set organization_id = p_organization_id,
        fiscal_year_id = p_fiscal_year_id,
        budget_request_id = p_budget_request_id,
        owner_name = p_owner_name,
        coordinator_name = p_coordinator_name,
        title_th = p_title_th,
        project_type = p_project_type,
        approved_budget = p_approved_budget,
        disbursement_target = p_disbursement_target,
        starts_on = p_starts_on,
        ends_on = p_ends_on,
        proposal_details = p_proposal_details,
        updated_by = actor_id
    where project.id = p_id
      and project.version = p_version
      and project.status = 'proposed'
      and not private.entity_has_pending_task('project', project.id)
    returning project.* into saved;

    if saved.id is null then
      raise exception 'project changed or is no longer editable' using errcode = '40001';
    end if;
  end if;

  if p_submit then
    perform public.submit_entity_for_approval('project', saved.id, p_comment);
    select * into saved from public.projects where id = saved.id;
  end if;

  return jsonb_build_object('id', saved.id, 'code', saved.code, 'version', saved.version);
end;
$$;

revoke all on function public.save_budget_request_transaction(
  uuid, integer, uuid, uuid, uuid, text, text, text, text, text, numeric, jsonb, jsonb, boolean, text
) from public, anon;
grant execute on function public.save_budget_request_transaction(
  uuid, integer, uuid, uuid, uuid, text, text, text, text, text, numeric, jsonb, jsonb, boolean, text
) to authenticated;

revoke all on function public.save_project_transaction(
  uuid, integer, uuid, uuid, uuid, text, text, text, text, numeric, numeric, date, date, jsonb, boolean, text
) from public, anon;
grant execute on function public.save_project_transaction(
  uuid, integer, uuid, uuid, uuid, text, text, text, text, numeric, numeric, date, date, jsonb, boolean, text
) to authenticated;

commit;
