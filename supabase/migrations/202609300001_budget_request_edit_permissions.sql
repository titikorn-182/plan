begin;

-- Keep the original request amount separate from subsequent approved amendments.
alter table public.budget_requests
  add column approved_amount numeric(18,2),
  add column amendment_reason text,
  add constraint budget_requests_approved_amount_check check (
    approved_amount >= 0 and approved_amount <= 999999999999
  );

create function private.enforce_budget_request_content_edit()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  content_changed boolean;
begin
  if auth.uid() is null then return new; end if;
  if TG_OP = 'INSERT' then
    if new.approved_amount is not null or new.amendment_reason is not null then
      raise exception 'approved amendments require an existing approved request' using errcode = '42501';
    end if;
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

create trigger budget_requests_content_edit
before insert or update on public.budget_requests
for each row execute function private.enforce_budget_request_content_edit();

-- A separate RPC prevents an approved amendment from using the draft/submit path.
create function public.amend_approved_budget_request(
  p_id uuid, p_version integer, p_title_th text, p_owner_name text,
  p_project_type text, p_category text, p_rationale text,
  p_proposal_details jsonb, p_approved_amount numeric, p_reason text
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare saved public.budget_requests%rowtype;
begin
  if auth.uid() is null or not private.user_has_role('admin') then
    raise exception 'admin required' using errcode = '42501';
  end if;
  if p_approved_amount is null or p_approved_amount < 0 or p_approved_amount > 999999999999
    or p_approved_amount <> round(p_approved_amount,2) then
    raise exception 'invalid approved amount' using errcode = '23514';
  end if;
  if nullif(btrim(p_reason),'') is null or length(p_reason)>1000 then
    raise exception 'amendment reason required' using errcode = '23514';
  end if;
  update public.budget_requests request
  set title_th=p_title_th, owner_name=p_owner_name, project_type=p_project_type,
      category=p_category, rationale=p_rationale,
      -- Retain the exact original JSON for disabled identity/expense fields,
      -- including legacy missing keys that form parsers normalize to defaults.
      proposal_details=(p_proposal_details - array['expenseItems','organizationCode','organizationName']) ||
        coalesce((select jsonb_object_agg(key,value) from jsonb_each(request.proposal_details)
          where key in ('expenseItems','organizationCode','organizationName')), '{}'::jsonb),
      approved_amount=p_approved_amount, amendment_reason=btrim(p_reason)
  where id=p_id and version=p_version and status='approved' and archived_at is null
  returning * into saved;
  if saved.id is null then
    raise exception 'budget request changed or is no longer editable' using errcode='PT409';
  end if;
  -- Existing audit trigger records actor, timestamp, reason, and old/new amounts.
  -- Deliberately do not update projects or approval tasks/history.
  return jsonb_build_object('id',saved.id,'code',saved.code,'version',saved.version);
end;
$$;
revoke all on function public.amend_approved_budget_request(uuid,integer,text,text,text,text,text,jsonb,numeric,text) from public, anon;
grant execute on function public.amend_approved_budget_request(uuid,integer,text,text,text,text,text,jsonb,numeric,text) to authenticated;

comment on column public.budget_requests.approved_amount is
  'Admin-amended approved amount; NULL retains the original requested amount for legacy approvals.';

-- Keep the existing single audit event, also surfacing the amendment reason
-- in the admin audit list rather than burying it only in the JSON snapshot.
create function private.audit_budget_request_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare source jsonb;
begin
  source := case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_events
    (organization_id,actor_id,actor_role,action,entity_type,entity_id,old_data,new_data,reason)
  values (
    (source->>'organization_id')::uuid,auth.uid(),private.current_app_role(),lower(TG_OP),
    'budget_request',(source->>'id')::uuid,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    case when TG_OP='UPDATE' and source->>'status'='approved' then source->>'amendment_reason' else null end
  );
  if TG_OP='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.audit_budget_request_change() from public,anon,authenticated;
drop trigger audit_budget_requests on public.budget_requests;
create trigger audit_budget_requests after insert or update or delete on public.budget_requests
for each row execute function private.audit_budget_request_change();

commit;
