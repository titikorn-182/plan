begin;

-- Requests and decisions are append-only workflow history, separate from approval tasks.
create table if not exists private.project_revision_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  organization_id uuid not null references public.organizations(id),
  requested_by uuid not null references public.profiles(id),
  reason text not null check (char_length(btrim(reason)) between 5 and 1000),
  status text not null default 'pending' check (status in ('pending', 'returned', 'declined')),
  created_at timestamptz not null default clock_timestamp(),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  decision_reason text,
  approved_snapshot jsonb not null,
  check ((status = 'pending' and decided_by is null and decided_at is null and decision_reason is null)
    or (status <> 'pending' and decided_by is not null and decided_at is not null
      and char_length(btrim(decision_reason)) between 5 and 1000))
);
create unique index if not exists project_revision_requests_pending_idx
  on private.project_revision_requests(project_id) where status = 'pending';
create index if not exists project_revision_requests_history_idx
  on private.project_revision_requests(project_id, created_at desc);
alter table private.project_revision_requests enable row level security;
revoke all on private.project_revision_requests from public, anon, authenticated;
drop trigger if exists audit_project_revision_requests on private.project_revision_requests;
create trigger audit_project_revision_requests after insert or update or delete
  on private.project_revision_requests for each row
  execute function private.audit_record_change('project_revision_request');

create or replace function public.request_project_revision(
  p_project_id uuid, p_version integer, p_reason text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  project_row public.projects%rowtype;
  request_id uuid;
  recipient uuid;
begin
  if auth.uid() is null or not private.user_has_role('staff') then
    raise exception 'only staff may request project revision' using errcode = '42501';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 5 and 1000 then
    raise exception 'revision reason must be 5 to 1000 characters' using errcode = '22023';
  end if;
  select * into project_row from public.projects where id = p_project_id for update;
  if project_row.id is null or project_row.owner_id is distinct from auth.uid() then
    raise exception 'only the project owner may request revision' using errcode = '42501';
  end if;
  if project_row.version is distinct from p_version or project_row.status <> 'active'
    or project_row.archived_at is not null or private.entity_has_pending_task('project', p_project_id) then
    raise exception 'project is no longer eligible for revision' using errcode = 'PT409';
  end if;
  if exists (select 1 from private.project_revision_requests where project_id = p_project_id and status = 'pending') then
    raise exception 'a revision request is already pending' using errcode = 'PT409';
  end if;
  insert into private.project_revision_requests(project_id, organization_id, requested_by, reason, approved_snapshot)
    values (project_row.id, project_row.organization_id, auth.uid(), btrim(p_reason), to_jsonb(project_row))
    returning id into request_id;
  for recipient in
    select distinct ur.profile_id from public.user_roles ur join public.profiles p on p.id = ur.profile_id
    where ur.role = 'admin' and p.is_active and ur.active_from <= now()
      and (ur.active_until is null or ur.active_until > now())
  loop
    perform private.notify_user(recipient, 'project', p_project_id,
      'ขอแก้ไขโครงการหลังอนุมัติ: ' || project_row.code, btrim(p_reason));
  end loop;
  return request_id;
end;
$$;

create or replace function public.decide_project_revision(
  p_project_id uuid, p_request_id uuid, p_version integer, p_return boolean, p_reason text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  project_row public.projects%rowtype;
  request_row private.project_revision_requests%rowtype;
begin
  if auth.uid() is null or not private.user_has_role('admin') then
    raise exception 'only admin may decide project revision' using errcode = '42501';
  end if;
  if p_return is null or p_reason is null or char_length(btrim(p_reason)) not between 5 and 1000 then
    raise exception 'revision decision reason must be 5 to 1000 characters' using errcode = '22023';
  end if;
  -- Always lock project before request, also serializing requests and new financial/report links.
  select * into project_row from public.projects where id = p_project_id for update;
  select * into request_row from private.project_revision_requests
    where id = p_request_id and project_id = p_project_id for update;
  if project_row.id is null or project_row.version is distinct from p_version
    or request_row.id is null or request_row.status <> 'pending' then
    raise exception 'project or revision request has changed' using errcode = 'PT409';
  end if;
  if p_return then
    if project_row.status <> 'active' or project_row.archived_at is not null
      or project_row.owner_id is distinct from request_row.requested_by
      or private.entity_has_pending_task('project', p_project_id) then
      raise exception 'project is no longer eligible for revision' using errcode = 'PT409';
    end if;
    if project_row.disbursed_amount <> 0
      or exists (select 1 from public.disbursements where project_id = p_project_id)
      or exists (select 1 from public.quarterly_reports where project_id = p_project_id)
      or exists (select 1 from public.project_completion_reports where project_id = p_project_id) then
      raise exception 'project has financial or report references' using errcode = 'PT422';
    end if;
    update public.projects set status = 'proposed', health = 'watch', updated_by = auth.uid()
      where id = p_project_id;
  end if;
  update private.project_revision_requests
    set status = case when p_return then 'returned' else 'declined' end,
      decided_by = auth.uid(), decided_at = now(), decision_reason = btrim(p_reason),
      approved_snapshot = to_jsonb(project_row)
    where id = p_request_id;
  perform private.notify_user(request_row.requested_by, 'project', p_project_id,
    case when p_return then 'ส่งกลับแก้ไขโครงการ: ' else 'ไม่อนุญาตให้แก้ไขโครงการ: ' end || project_row.code,
    btrim(p_reason));
  return p_request_id;
end;
$$;

-- New links must not race an admin return or be created during revision/reapproval.
create or replace function private.guard_project_revision_links()
returns trigger language plpgsql security definer set search_path = '' as $$
declare project_state public.project_status;
begin
  select status into project_state from public.projects where id = new.project_id for update;
  if project_state = 'proposed' and exists (
    select 1 from private.project_revision_requests where project_id = new.project_id and status = 'returned'
  ) then
    raise exception 'project revision requires reapproval before financial or report activity' using errcode = '23514';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_project_revision_links on public.disbursements;
create trigger guard_project_revision_links before insert or update of project_id on public.disbursements
  for each row execute function private.guard_project_revision_links();
drop trigger if exists guard_project_revision_links on public.quarterly_reports;
create trigger guard_project_revision_links before insert or update of project_id on public.quarterly_reports
  for each row execute function private.guard_project_revision_links();
drop trigger if exists guard_project_revision_links on public.project_completion_reports;
create trigger guard_project_revision_links before insert or update of project_id on public.project_completion_reports
  for each row execute function private.guard_project_revision_links();

revoke all on function private.guard_project_revision_links() from public, anon, authenticated;

-- Only the latest summary for the visible register page; snapshots never reach the client.
create or replace function public.get_project_revision_requests(p_project_ids uuid[])
returns table(project_id uuid, request_id uuid, status text, reason text, decision_reason text)
language sql stable security definer set search_path = '' as $$
  select distinct on (r.project_id) r.project_id, r.id, r.status, r.reason, r.decision_reason
  from private.project_revision_requests r
  where r.project_id = any(p_project_ids[1:100]) and (
    private.user_has_role('admin') or (
      r.requested_by = auth.uid() and private.user_has_role('staff')
      and private.can_access_project(r.project_id)
    )
  )
  order by r.project_id, r.created_at desc, r.id desc;
$$;
revoke all on function public.get_project_revision_requests(uuid[]) from public, anon;
grant execute on function public.get_project_revision_requests(uuid[]) to authenticated;
revoke all on function public.request_project_revision(uuid,integer,text) from public, anon;
revoke all on function public.decide_project_revision(uuid,uuid,integer,boolean,text) from public, anon;
grant execute on function public.request_project_revision(uuid,integer,text) to authenticated;
grant execute on function public.decide_project_revision(uuid,uuid,integer,boolean,text) to authenticated;
commit;
