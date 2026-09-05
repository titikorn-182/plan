begin;

-- Keep the status transition and approval-task creation in one database
-- transaction. If task creation fails, the request remains editable instead
-- of being stranded in a submitted state without a pending task.
create or replace function public.submit_budget_request_for_approval(
  p_entity_id uuid,
  p_comment text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.budget_requests%rowtype;
  cycle_row public.budget_cycles%rowtype;
  task_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select *
    into request_row
  from public.budget_requests request
  where request.id = p_entity_id
    and request.archived_at is null
  for update;

  if request_row.id is null then
    raise exception 'budget request was not found' using errcode = '42501';
  end if;

  select *
    into cycle_row
  from public.budget_cycles cycle
  where cycle.id = request_row.budget_cycle_id;

  if not (
    private.can_manage_org(request_row.organization_id)
    or (
      private.user_has_role('staff')
      and request_row.owner_id = (select auth.uid())
      and private.org_in_scope(request_row.organization_id)
    )
  ) then
    raise exception 'you are not allowed to submit this budget request' using errcode = '42501';
  end if;

  if request_row.status not in ('draft', 'revision_required') then
    raise exception 'only draft or revision-required requests can be submitted' using errcode = '23514';
  end if;

  if cycle_row.status <> 'open' or now() not between cycle_row.opens_at and cycle_row.closes_at then
    raise exception 'the budget cycle is not open' using errcode = '23514';
  end if;

  if private.user_has_role('staff') and not private.can_manage_org(request_row.organization_id) and not cycle_row.allow_staff_submit then
    raise exception 'staff submission is disabled for this budget cycle' using errcode = '42501';
  end if;

  update public.budget_requests
  set status = 'submitted',
      submitted_at = now(),
      updated_by = (select auth.uid())
  where id = request_row.id;

  task_id := public.submit_entity_for_approval(
    'budget_request',
    request_row.id,
    p_comment
  );

  return task_id;
end;
$$;

revoke all on function public.submit_budget_request_for_approval(uuid, text) from public, anon;
grant execute on function public.submit_budget_request_for_approval(uuid, text) to authenticated;

commit;
