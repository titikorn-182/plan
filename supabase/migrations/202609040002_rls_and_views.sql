begin;

create or replace function private.user_has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.profile_id
    where ur.profile_id = (select auth.uid())
      and ur.role = required_role
      and p.is_active
      and ur.active_from <= now()
      and (ur.active_until is null or ur.active_until > now())
  );
$$;

create or replace function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select ur.role
  from public.user_roles ur
  join public.profiles p on p.id = ur.profile_id
  where ur.profile_id = (select auth.uid())
    and p.is_active
    and ur.active_from <= now()
    and (ur.active_until is null or ur.active_until > now())
  order by case ur.role when 'admin' then 1 when 'executive' then 2 when 'user' then 3 else 4 end
  limit 1;
$$;

create or replace function private.org_in_scope(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive lineage as (
    select o.id, o.parent_id
    from public.organizations o
    where o.id = target_organization_id
    union all
    select parent.id, parent.parent_id
    from public.organizations parent
    join lineage child on child.parent_id = parent.id
  )
  select exists (
    select 1
    from public.user_organization_scopes scope
    join lineage on lineage.id = scope.organization_id
    where scope.profile_id = (select auth.uid())
      and scope.active_from <= now()
      and (scope.active_until is null or scope.active_until > now())
  );
$$;

create or replace function private.can_view_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.user_has_role('admin')
    or (
      (private.user_has_role('user') or private.user_has_role('executive'))
      and private.org_in_scope(target_organization_id)
    );
$$;

create or replace function private.can_manage_org(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.user_has_role('admin')
    or (private.user_has_role('user') and private.org_in_scope(target_organization_id));
$$;

create or replace function private.can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and (
        private.can_view_org(p.organization_id)
        or (
          private.current_app_role() is not null and (
            p.owner_id = (select auth.uid())
            or p.coordinator_id = (select auth.uid())
            or exists (
              select 1 from public.project_members pm
              where pm.project_id = p.id and pm.profile_id = (select auth.uid())
            )
          )
        )
      )
  );
$$;

create or replace function private.can_access_entity(target_type text, target_id uuid, target_organization_id uuid)
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

grant usage on schema private to authenticated;
grant execute on function private.user_has_role(public.app_role) to authenticated;
grant execute on function private.current_app_role() to authenticated;
grant execute on function private.org_in_scope(uuid) to authenticated;
grant execute on function private.can_view_org(uuid) to authenticated;
grant execute on function private.can_manage_org(uuid) to authenticated;
grant execute on function private.can_access_project(uuid) to authenticated;
grant execute on function private.can_access_entity(text, uuid, uuid) to authenticated;
revoke all on all functions in schema private from public, anon;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_organization_scopes enable row level security;
alter table public.fiscal_years enable row level security;
alter table public.budget_cycles enable row level security;
alter table public.budget_requests enable row level security;
alter table public.budget_lines enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.quarterly_reports enable row level security;
alter table public.disbursements enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.kpi_results enable row level security;
alter table public.approval_tasks enable row level security;
alter table public.attachments enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.organizations, public.profiles, public.user_roles, public.user_organization_scopes,
  public.fiscal_years, public.budget_cycles, public.budget_requests, public.budget_lines, public.projects,
  public.project_members, public.quarterly_reports, public.disbursements, public.kpi_definitions,
  public.kpi_results, public.approval_tasks, public.attachments, public.comments, public.notifications,
  public.audit_events from anon, authenticated;

grant select on table public.profiles, public.user_roles, public.user_organization_scopes,
  public.organizations, public.fiscal_years, public.budget_cycles, public.budget_requests,
  public.budget_lines, public.projects, public.project_members, public.quarterly_reports,
  public.disbursements, public.kpi_definitions, public.kpi_results, public.approval_tasks,
  public.attachments, public.comments, public.notifications, public.audit_events to authenticated;
grant insert, update, delete on table public.user_roles, public.user_organization_scopes,
  public.organizations, public.fiscal_years, public.budget_cycles to authenticated;
grant insert, update, delete on table public.budget_requests, public.budget_lines, public.projects,
  public.project_members, public.quarterly_reports, public.disbursements, public.kpi_definitions,
  public.kpi_results, public.approval_tasks, public.attachments, public.comments to authenticated;
grant update on table public.notifications to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;

create policy organizations_select on public.organizations for select to authenticated
  using (private.user_has_role('admin') or private.org_in_scope(id));
create policy organizations_admin_insert on public.organizations for insert to authenticated
  with check (private.user_has_role('admin'));
create policy organizations_admin_update on public.organizations for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy organizations_admin_delete on public.organizations for delete to authenticated
  using (private.user_has_role('admin') and not is_active);

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.user_has_role('admin'));

create policy user_roles_select on public.user_roles for select to authenticated
  using (profile_id = (select auth.uid()) or private.user_has_role('admin'));
create policy user_roles_admin_insert on public.user_roles for insert to authenticated
  with check (private.user_has_role('admin'));
create policy user_roles_admin_update on public.user_roles for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy user_roles_admin_delete on public.user_roles for delete to authenticated
  using (private.user_has_role('admin'));

create policy user_scopes_select on public.user_organization_scopes for select to authenticated
  using (profile_id = (select auth.uid()) or private.user_has_role('admin'));
create policy user_scopes_admin_insert on public.user_organization_scopes for insert to authenticated
  with check (private.user_has_role('admin'));
create policy user_scopes_admin_update on public.user_organization_scopes for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy user_scopes_admin_delete on public.user_organization_scopes for delete to authenticated
  using (private.user_has_role('admin'));

create policy fiscal_years_select on public.fiscal_years for select to authenticated using (true);
create policy fiscal_years_admin_insert on public.fiscal_years for insert to authenticated with check (private.user_has_role('admin'));
create policy fiscal_years_admin_update on public.fiscal_years for update to authenticated using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy fiscal_years_admin_delete on public.fiscal_years for delete to authenticated using (private.user_has_role('admin') and status = 'archived');
create policy budget_cycles_select on public.budget_cycles for select to authenticated using (true);
create policy budget_cycles_admin_insert on public.budget_cycles for insert to authenticated with check (private.user_has_role('admin'));
create policy budget_cycles_admin_update on public.budget_cycles for update to authenticated using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy budget_cycles_admin_delete on public.budget_cycles for delete to authenticated using (private.user_has_role('admin') and status = 'archived');

create policy budget_requests_select on public.budget_requests for select to authenticated
  using (private.can_view_org(organization_id) or (private.current_app_role() is not null and (owner_id = (select auth.uid()) or coordinator_id = (select auth.uid()))));
create policy budget_requests_insert on public.budget_requests for insert to authenticated
  with check (
    created_by = (select auth.uid()) and status in ('draft', 'submitted')
    and (
      private.can_manage_org(organization_id)
      or (private.user_has_role('staff') and private.org_in_scope(organization_id) and owner_id = (select auth.uid()))
    )
    and exists (
      select 1 from public.budget_cycles bc
      where bc.id = budget_cycle_id and bc.fiscal_year_id = budget_requests.fiscal_year_id
        and bc.status = 'open' and now() between bc.opens_at and bc.closes_at
        and (bc.allow_staff_submit or not private.user_has_role('staff'))
    )
  );
create policy budget_requests_update on public.budget_requests for update to authenticated
  using (
    locked_at is null and status in ('draft', 'revision_required')
    and (private.can_manage_org(organization_id) or (private.user_has_role('staff') and owner_id = (select auth.uid())))
  )
  with check (private.can_manage_org(organization_id) or (private.user_has_role('staff') and owner_id = (select auth.uid())));
create policy budget_requests_admin_update_all on public.budget_requests for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy budget_requests_review_update on public.budget_requests for update to authenticated
  using (
    locked_at is null and (
      (private.user_has_role('user') and private.can_view_org(organization_id) and status in ('submitted', 'under_review', 'pending_approval'))
      or (private.user_has_role('executive') and private.can_view_org(organization_id) and status = 'pending_approval')
    )
  )
  with check (
    (private.user_has_role('user') and private.can_view_org(organization_id))
    or (private.user_has_role('executive') and private.can_view_org(organization_id))
  );
create policy budget_requests_admin_delete on public.budget_requests for delete to authenticated
  using (private.user_has_role('admin') and status in ('draft', 'cancelled'));

create policy budget_lines_select on public.budget_lines for select to authenticated
  using (exists (select 1 from public.budget_requests b where b.id = budget_request_id));
create policy budget_lines_insert on public.budget_lines for insert to authenticated
  with check (exists (
    select 1 from public.budget_requests b where b.id = budget_request_id and b.locked_at is null
      and b.status in ('draft', 'revision_required')
      and (private.can_manage_org(b.organization_id) or b.owner_id = (select auth.uid()))
  ));
create policy budget_lines_update on public.budget_lines for update to authenticated
  using (exists (
    select 1 from public.budget_requests b where b.id = budget_request_id and b.locked_at is null
      and b.status in ('draft', 'revision_required')
      and (private.can_manage_org(b.organization_id) or b.owner_id = (select auth.uid()))
  ));
create policy budget_lines_delete on public.budget_lines for delete to authenticated
  using (exists (
    select 1 from public.budget_requests b where b.id = budget_request_id and b.locked_at is null
      and b.status in ('draft', 'revision_required')
      and (private.can_manage_org(b.organization_id) or b.owner_id = (select auth.uid()))
  ));

create policy projects_select on public.projects for select to authenticated
  using (private.can_access_project(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (created_by = (select auth.uid()) and (private.can_manage_org(organization_id) or (private.user_has_role('staff') and private.org_in_scope(organization_id) and owner_id = (select auth.uid()))));
create policy projects_update on public.projects for update to authenticated
  using (private.can_manage_org(organization_id) or (private.user_has_role('staff') and owner_id = (select auth.uid())))
  with check (private.can_manage_org(organization_id) or (private.user_has_role('staff') and owner_id = (select auth.uid())));
create policy projects_admin_delete on public.projects for delete to authenticated
  using (private.user_has_role('admin') and status = 'cancelled');

create policy project_members_select on public.project_members for select to authenticated
  using (profile_id = (select auth.uid()) or private.can_access_project(project_id));
create policy project_members_manage on public.project_members for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and private.can_manage_org(p.organization_id)))
  with check (exists (select 1 from public.projects p where p.id = project_id and private.can_manage_org(p.organization_id)));

create policy quarterly_reports_select on public.quarterly_reports for select to authenticated
  using (private.can_access_project(project_id));
create policy quarterly_reports_insert on public.quarterly_reports for insert to authenticated
  with check (created_by = (select auth.uid()) and private.current_app_role() is not null and private.can_access_project(project_id));
create policy quarterly_reports_update on public.quarterly_reports for update to authenticated
  using (status in ('draft', 'revision_required') and private.can_access_project(project_id))
  with check (private.can_access_project(project_id));
create policy quarterly_reports_admin_delete on public.quarterly_reports for delete to authenticated
  using (private.user_has_role('admin') and status = 'draft');

create policy disbursements_select on public.disbursements for select to authenticated
  using (private.can_access_project(project_id));
create policy disbursements_insert on public.disbursements for insert to authenticated
  with check (created_by = (select auth.uid()) and private.current_app_role() is not null and private.can_access_project(project_id));
create policy disbursements_update on public.disbursements for update to authenticated
  using (private.can_manage_org(organization_id)) with check (private.can_manage_org(organization_id));
create policy disbursements_admin_delete on public.disbursements for delete to authenticated
  using (private.user_has_role('admin'));

create policy kpi_definitions_select on public.kpi_definitions for select to authenticated
  using (private.can_view_org(organization_id) or (private.current_app_role() is not null and owner_id = (select auth.uid())));
create policy kpi_definitions_admin_insert on public.kpi_definitions for insert to authenticated
  with check (private.user_has_role('admin'));
create policy kpi_definitions_admin_update on public.kpi_definitions for update to authenticated
  using (private.user_has_role('admin')) with check (private.user_has_role('admin'));
create policy kpi_definitions_admin_delete on public.kpi_definitions for delete to authenticated
  using (private.user_has_role('admin') and not is_active);

create policy kpi_results_select on public.kpi_results for select to authenticated
  using (
    private.can_view_org(organization_id)
    or (
      private.current_app_role() is not null
      and (
        assignee_id = (select auth.uid())
        or exists (
          select 1
          from public.kpi_definitions kd
          where kd.id = kpi_definition_id
            and kd.owner_id = (select auth.uid())
        )
      )
    )
  );
create policy kpi_results_insert on public.kpi_results for insert to authenticated
  with check (created_by = (select auth.uid()) and (private.can_manage_org(organization_id) or (private.user_has_role('staff') and private.org_in_scope(organization_id) and assignee_id = (select auth.uid()))));
create policy kpi_results_update on public.kpi_results for update to authenticated
  using (status in ('not_started', 'draft', 'revision_required') and (private.can_manage_org(organization_id) or assignee_id = (select auth.uid())))
  with check (private.can_manage_org(organization_id) or assignee_id = (select auth.uid()));
create policy kpi_results_admin_delete on public.kpi_results for delete to authenticated using (private.user_has_role('admin'));

create policy approval_tasks_select on public.approval_tasks for select to authenticated
  using ((private.current_app_role() is not null and assignee_id = (select auth.uid())) or private.can_view_org(organization_id));
create policy approval_tasks_manage on public.approval_tasks for all to authenticated
  using (private.user_has_role('admin') or assignee_id = (select auth.uid()))
  with check (private.user_has_role('admin') or assignee_id = (select auth.uid()));

create policy attachments_select on public.attachments for select to authenticated
  using (private.can_access_entity(entity_type, entity_id, organization_id));
create policy attachments_insert on public.attachments for insert to authenticated
  with check (uploaded_by = (select auth.uid()) and private.can_access_entity(entity_type, entity_id, organization_id));
create policy attachments_update on public.attachments for update to authenticated
  using (uploaded_by = (select auth.uid()) or private.can_manage_org(organization_id))
  with check (uploaded_by = (select auth.uid()) or private.can_manage_org(organization_id));
create policy attachments_admin_delete on public.attachments for delete to authenticated using (private.user_has_role('admin'));

create policy comments_select on public.comments for select to authenticated
  using (private.can_access_entity(entity_type, entity_id, organization_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (created_by = (select auth.uid()) and private.can_access_entity(entity_type, entity_id, organization_id));
create policy comments_update on public.comments for update to authenticated
  using (created_by = (select auth.uid()) and archived_at is null)
  with check (created_by = (select auth.uid()));
create policy comments_admin_delete on public.comments for delete to authenticated using (private.user_has_role('admin'));

create policy notifications_select on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy audit_events_select on public.audit_events for select to authenticated
  using (actor_id = (select auth.uid()) or private.user_has_role('admin') or (organization_id is not null and private.can_view_org(organization_id)));

create or replace function private.enforce_budget_request_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'submitted' then
    if char_length(trim(new.rationale)) < 20 then
      raise exception 'a submitted budget request requires a rationale of at least 20 characters' using errcode = '23514';
    end if;
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_budget_request_insert() from public, anon, authenticated;

create trigger enforce_budget_request_insert
  before insert on public.budget_requests
  for each row execute function private.enforce_budget_request_insert();

create or replace function private.enforce_budget_request_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_role public.app_role;
begin
  if (select auth.uid()) is null or private.user_has_role('admin') then
    if new.status = 'approved' and old.status <> 'approved' then new.locked_at := coalesce(new.locked_at, now()); end if;
    return new;
  end if;

  active_role := private.current_app_role();

  if old.status in ('draft', 'revision_required')
    and (old.owner_id = (select auth.uid()) or active_role = 'user')
    and new.status in ('draft', 'submitted', 'withdrawn') then
    null;
  elsif active_role = 'user' and private.can_view_org(old.organization_id)
    and old.status in ('submitted', 'under_review', 'pending_approval')
    and new.status in ('under_review', 'revision_required', 'pending_approval') then
    null;
  elsif active_role = 'executive' and private.can_view_org(old.organization_id)
    and old.status = 'pending_approval'
    and new.status in ('approved', 'rejected', 'revision_required') then
    null;
  else
    raise exception 'budget request status transition is not allowed' using errcode = '42501';
  end if;

  if old.status not in ('draft', 'revision_required') and (
    new.organization_id <> old.organization_id or new.fiscal_year_id <> old.fiscal_year_id
    or new.budget_cycle_id <> old.budget_cycle_id or new.owner_id is distinct from old.owner_id
    or new.created_by is distinct from old.created_by
  ) then
    raise exception 'protected budget request fields cannot be changed after submission' using errcode = '42501';
  end if;

  if new.status = 'submitted' and old.status <> 'submitted' then new.submitted_at := coalesce(new.submitted_at, now()); end if;
  if new.status = 'approved' and old.status <> 'approved' then new.locked_at := coalesce(new.locked_at, now()); end if;
  return new;
end;
$$;

revoke all on function private.enforce_budget_request_transition() from public, anon, authenticated;

create trigger enforce_budget_request_transition
  before update on public.budget_requests
  for each row execute function private.enforce_budget_request_transition();

create or replace function private.audit_record_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source jsonb;
  target_id uuid;
  target_org uuid;
begin
  source := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  target_id := (source ->> 'id')::uuid;
  target_org := nullif(source ->> 'organization_id', '')::uuid;
  insert into public.audit_events (organization_id, actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  values (
    target_org,
    (select auth.uid()),
    private.current_app_role(),
    lower(tg_op),
    tg_argv[0],
    target_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.audit_record_change() from public, anon, authenticated;

create trigger audit_budget_requests after insert or update or delete on public.budget_requests for each row execute function private.audit_record_change('budget_request');
create trigger audit_projects after insert or update or delete on public.projects for each row execute function private.audit_record_change('project');
create trigger audit_quarterly_reports after insert or update or delete on public.quarterly_reports for each row execute function private.audit_record_change('quarterly_report');
create trigger audit_disbursements after insert or update or delete on public.disbursements for each row execute function private.audit_record_change('disbursement');
create trigger audit_kpi_results after insert or update or delete on public.kpi_results for each row execute function private.audit_record_change('kpi_result');

create view public.budget_request_register with (security_invoker = true) as
select b.id, b.code, b.title_th as title, o.name_th as unit, b.category, b.requested_amount as amount,
  b.status::text as status, b.updated_at, b.version, b.organization_id, fy.buddhist_year
from public.budget_requests b
join public.organizations o on o.id = b.organization_id
join public.fiscal_years fy on fy.id = b.fiscal_year_id
where b.archived_at is null;

create view public.project_register with (security_invoker = true) as
select p.id, p.code, p.title_th as title, o.name_th as unit, p.owner_name as owner,
  p.approved_budget as budget, p.disbursed_amount as spent, p.progress, p.health::text as health,
  p.status::text as status, p.ends_on as due, p.organization_id, p.updated_at, p.version
from public.projects p
join public.organizations o on o.id = p.organization_id
where p.archived_at is null;

create view public.quarterly_report_register with (security_invoker = true) as
select r.id, p.code as project, p.title_th as title, o.name_th as unit, r.quarter,
  fy.buddhist_year, r.due_at, r.status::text as status, r.cumulative_progress as progress,
  r.evidence_count as evidence, r.organization_id, r.version
from public.quarterly_reports r
join public.projects p on p.id = r.project_id
join public.organizations o on o.id = r.organization_id
join public.fiscal_years fy on fy.id = r.fiscal_year_id;

create view public.disbursement_register with (security_invoker = true) as
select p.id as project_id, p.disbursement_code as id, p.title_th as project, o.name_th as unit,
  p.approved_budget as approved,
  coalesce(sum(d.amount) filter (where d.quarter = 1), 0)::numeric(18,2) as q1,
  coalesce(sum(d.amount) filter (where d.quarter = 2), 0)::numeric(18,2) as q2,
  coalesce(sum(d.amount) filter (where d.quarter = 3), 0)::numeric(18,2) as q3,
  coalesce(sum(d.amount) filter (where d.quarter = 4), 0)::numeric(18,2) as q4,
  p.disbursement_target as target, p.disbursement_state::text as status, p.organization_id
from public.projects p
join public.organizations o on o.id = p.organization_id
left join public.disbursements d on d.project_id = p.id
where p.disbursement_code is not null and p.archived_at is null
group by p.id, p.disbursement_code, p.title_th, o.name_th, p.approved_budget,
  p.disbursement_target, p.disbursement_state, p.organization_id;

create view public.kpi_register with (security_invoker = true) as
select kr.id, kd.code, kd.framework, kd.name, kd.owner_name as owner, kd.target,
  kr.actual, kd.unit, kr.result_state::text as status, kr.status::text as workflow_status,
  kr.evidence_count, kr.organization_id, kr.version
from public.kpi_results kr
join public.kpi_definitions kd on kd.id = kr.kpi_definition_id
where kd.is_active;

create view public.decision_queue with (security_invoker = true) as
select b.id as entity_id, 'budget_request'::text as entity_type, b.code as business_id,
  b.title_th as title, o.name_th as unit, 'คำของบ'::text as stage, b.status::text as raw_state,
  b.requested_amount as amount_value, null::text as amount_note, b.priority::text as severity,
  b.owner_name as owner, b.coordinator_name as coordinator, fy.buddhist_year,
  b.project_type, b.progress,
  coalesce((select jsonb_agg(jsonb_build_object('name', a.file_name, 'date', a.uploaded_at, 'verified', a.is_verified) order by a.uploaded_at) from public.attachments a where a.entity_type = 'budget_request' and a.entity_id = b.id and a.archived_at is null), '[]'::jsonb) as evidence,
  b.updated_at as sort_key
from public.budget_requests b
join public.organizations o on o.id = b.organization_id
join public.fiscal_years fy on fy.id = b.fiscal_year_id
where b.archived_at is null and b.status not in ('approved', 'rejected', 'withdrawn', 'cancelled')
union all
select p.id, 'project', p.code, p.title_th, o.name_th,
  case when p.status = 'proposed' then 'โครงการ' else 'ดำเนินงาน' end,
  p.health::text,
  p.approved_budget, null::text, case when p.health in ('at_risk', 'delayed') then 'critical' else 'medium' end,
  p.owner_name, p.coordinator_name, fy.buddhist_year, p.project_type, p.progress,
  coalesce((select jsonb_agg(jsonb_build_object('name', a.file_name, 'date', a.uploaded_at, 'verified', a.is_verified) order by a.uploaded_at) from public.attachments a where a.entity_type = 'project' and a.entity_id = p.id and a.archived_at is null), '[]'::jsonb),
  p.updated_at
from public.projects p
join public.organizations o on o.id = p.organization_id
join public.fiscal_years fy on fy.id = p.fiscal_year_id
where p.archived_at is null and p.status in ('proposed', 'active', 'on_hold')
union all
select p.id, 'disbursement', p.disbursement_code, p.title_th, o.name_th, 'เบิกจ่าย', p.disbursement_state::text,
  p.approved_budget, null::text, case when p.disbursement_state = 'delayed' then 'critical' else 'high' end,
  p.owner_name, p.coordinator_name, fy.buddhist_year, p.project_type, p.progress,
  coalesce((select jsonb_agg(jsonb_build_object('name', a.file_name, 'date', a.uploaded_at, 'verified', a.is_verified) order by a.uploaded_at) from public.attachments a where a.entity_type = 'project' and a.entity_id = p.id and a.archived_at is null), '[]'::jsonb),
  p.updated_at
from public.projects p
join public.organizations o on o.id = p.organization_id
join public.fiscal_years fy on fy.id = p.fiscal_year_id
where p.archived_at is null and p.disbursement_code is not null and p.disbursement_state in ('pending_docs', 'delayed')
union all
select kr.id, 'kpi_result', kd.code, kd.name, o.name_th, 'KPI', kr.status::text,
  null::numeric, concat('เป้าหมาย ', kd.target, ' ', kd.unit, ' · ผล ', coalesce(kr.actual::text, '—'), ' ', kd.unit),
  case when kr.result_state in ('at_risk', 'not_achieved') then 'high' else 'medium' end,
  kd.owner_name, kd.owner_name, fy.buddhist_year, concat(kd.framework, ' ', kd.framework_version),
  least(100, greatest(0, coalesce(round((kr.actual / nullif(kd.target, 0)) * 100), 0)))::smallint,
  coalesce((select jsonb_agg(jsonb_build_object('name', a.file_name, 'date', a.uploaded_at, 'verified', a.is_verified) order by a.uploaded_at) from public.attachments a where a.entity_type = 'kpi_result' and a.entity_id = kr.id and a.archived_at is null), '[]'::jsonb),
  kr.updated_at
from public.kpi_results kr
join public.kpi_definitions kd on kd.id = kr.kpi_definition_id
join public.organizations o on o.id = kr.organization_id
join public.fiscal_years fy on fy.id = kr.fiscal_year_id
where kr.status in ('submitted', 'revision_required', 'overdue') or kr.result_state in ('at_risk', 'not_achieved', 'no_data');

grant select on table public.budget_request_register, public.project_register,
  public.quarterly_report_register, public.disbursement_register, public.kpi_register,
  public.decision_queue to authenticated;

commit;
