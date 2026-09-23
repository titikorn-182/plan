begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Enforce source eligibility for direct RPC/table writes as well as the UI.
-- Existing links are historical references: unrelated project edits must remain
-- possible when their budget source is archived after the project was created.
create or replace function private.validate_project_approved_budget_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_id uuid;
begin
  if new.budget_request_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.budget_request_id is not distinct from old.budget_request_id
     and new.organization_id is not distinct from old.organization_id
     and new.fiscal_year_id is not distinct from old.fiscal_year_id then
    return new;
  end if;

  -- SECURITY DEFINER is required only for the row lock: an invoker SELECT FOR
  -- SHARE would also apply UPDATE RLS and hide approved/locked budgets from
  -- staff. The access predicate below mirrors budget_requests_select exactly.
  -- No direct execution privilege or business-data write is granted here.
  select budget.id into source_id
  from public.budget_requests budget
  where budget.id = new.budget_request_id
    and budget.status = 'approved'
    and budget.archived_at is null
    and budget.organization_id = new.organization_id
    and budget.fiscal_year_id = new.fiscal_year_id
    and budget.id <> all(array[
      '40000000-0000-0000-0000-000000000001'::uuid,
      '40000000-0000-0000-0000-000000000002'::uuid,
      '40000000-0000-0000-0000-000000000003'::uuid,
      '40000000-0000-0000-0000-000000000004'::uuid,
      '40000000-0000-0000-0000-000000000005'::uuid,
      '40000000-0000-0000-0000-000000000006'::uuid
    ])
    and (
      private.can_view_org(budget.organization_id)
      or (
        private.current_app_role() is not null
        and (budget.owner_id = (select auth.uid()) or budget.coordinator_id = (select auth.uid()))
      )
    )
  for share of budget;

  if source_id is null then
    raise exception 'approved budget source is no longer available or does not match the project'
      using errcode = 'PT409';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_project_approved_budget_source()
  from public, anon, authenticated;

drop trigger if exists validate_project_approved_budget_source on public.projects;
create trigger validate_project_approved_budget_source
before insert or update of budget_request_id, organization_id, fiscal_year_id on public.projects
for each row execute function private.validate_project_approved_budget_source();

commit;
