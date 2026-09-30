begin;

-- Keep each page's summary lookup bounded to the requested projects' history.
create index if not exists approval_tasks_project_history_idx
  on public.approval_tasks(entity_id, created_at desc, id desc)
  where entity_type = 'project';

-- Expose only the workflow state, not approval comments or reviewer identities.
-- Staff can read their project summary without gaining access to approval_tasks.
create or replace function public.get_project_approval_states(p_project_ids uuid[])
returns table(project_id uuid, approval_state text)
language sql stable security definer set search_path = '' as $$
  select p.id,
    case
      when p.status = 'cancelled' then 'cancelled'
      when p.status = 'completed' then 'completed'
      when p.status = 'on_hold' then 'on_hold'
      when pending.total > 0 then
        case when pending.total = 1 and pending.role = 'user' then 'unit_review'
          when pending.total = 1 and pending.role = 'executive' then 'executive_review'
          else 'pending' end
      when p.status = 'active' then 'approved'
      when revision.status = 'returned'
        and (latest.acted_at is null or revision.decided_at >= latest.acted_at) then 'revision_required'
      when latest.status = 'revision_required' then 'revision_required'
      when latest.status = 'rejected' then 'rejected'
      when latest.status is null then 'awaiting_submission'
      else 'unknown'
    end
  from public.projects p
  cross join lateral (
    select count(*) as total, min(t.required_role::text) as role
    from public.approval_tasks t
    where t.entity_type = 'project' and t.entity_id = p.id and t.status = 'pending'
  ) pending
  left join lateral (
    select t.status, t.acted_at from public.approval_tasks t
    where t.entity_type = 'project' and t.entity_id = p.id
    order by t.created_at desc, t.id desc limit 1
  ) latest on true
  left join lateral (
    select r.status, r.decided_at from private.project_revision_requests r where r.project_id = p.id
    order by r.created_at desc, r.id desc limit 1
  ) revision on true
  where p.id = any(p_project_ids[1:100]) and p.archived_at is null
    and private.can_access_project(p.id);
$$;
revoke all on function public.get_project_approval_states(uuid[]) from public, anon;
grant execute on function public.get_project_approval_states(uuid[]) to authenticated;

commit;
