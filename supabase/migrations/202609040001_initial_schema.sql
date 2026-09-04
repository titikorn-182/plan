begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.app_role as enum ('admin', 'user', 'executive', 'staff');
create type public.cycle_status as enum ('open', 'closed', 'archived');
create type public.document_status as enum ('draft', 'submitted', 'under_review', 'pending_approval', 'revision_required', 'approved', 'rejected', 'withdrawn', 'cancelled');
create type public.priority_level as enum ('medium', 'high', 'critical');
create type public.project_status as enum ('proposed', 'active', 'on_hold', 'completed', 'cancelled');
create type public.health_status as enum ('normal', 'watch', 'at_risk', 'delayed');
create type public.report_status as enum ('draft', 'submitted', 'under_review', 'revision_required', 'approved', 'overdue');
create type public.disbursement_status as enum ('recorded', 'reconciled', 'pending_docs', 'delayed');
create type public.kpi_result_status as enum ('not_started', 'draft', 'submitted', 'revision_required', 'verified', 'overdue', 'not_applicable');
create type public.result_state as enum ('achieved', 'on_track', 'at_risk', 'not_achieved', 'no_data');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_th text not null,
  name_en text,
  organization_type text not null,
  parent_id uuid references public.organizations(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  organization_id uuid references public.organizations(id),
  active_from timestamptz not null default now(),
  active_until timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique nulls not distinct (profile_id, role, organization_id)
);

create table public.user_organization_scopes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  active_from timestamptz not null default now(),
  active_until timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  unique (profile_id, organization_id)
);

create table public.fiscal_years (
  id uuid primary key default gen_random_uuid(),
  buddhist_year integer not null unique check (buddhist_year between 2500 and 3000),
  label text not null,
  status public.cycle_status not null default 'open',
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_on <= ends_on)
);

create table public.budget_cycles (
  id uuid primary key default gen_random_uuid(),
  fiscal_year_id uuid not null references public.fiscal_years(id),
  name text not null,
  status public.cycle_status not null default 'open',
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  allow_staff_submit boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fiscal_year_id, name),
  check (opens_at < closes_at)
);

create table public.budget_requests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  fiscal_year_id uuid not null references public.fiscal_years(id),
  budget_cycle_id uuid not null references public.budget_cycles(id),
  organization_id uuid not null references public.organizations(id),
  owner_id uuid references public.profiles(id),
  coordinator_id uuid references public.profiles(id),
  owner_name text not null,
  coordinator_name text not null,
  title_th text not null,
  title_en text,
  category text not null,
  project_type text not null,
  rationale text not null default '',
  priority public.priority_level not null default 'medium',
  status public.document_status not null default 'draft',
  requested_amount numeric(18,2) not null default 0 check (requested_amount >= 0),
  progress smallint not null default 0 check (progress between 0 and 100),
  submitted_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1 check (version > 0),
  archived_at timestamptz
);

create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_request_id uuid not null references public.budget_requests(id) on delete cascade,
  expense_category text not null,
  description text not null,
  quantity numeric(14,2) not null check (quantity >= 0),
  unit_price numeric(18,2) not null check (unit_price >= 0),
  total numeric(18,2) generated always as (quantity * unit_price) stored,
  q1_amount numeric(18,2) not null default 0 check (q1_amount >= 0),
  q2_amount numeric(18,2) not null default 0 check (q2_amount >= 0),
  q3_amount numeric(18,2) not null default 0 check (q3_amount >= 0),
  q4_amount numeric(18,2) not null default 0 check (q4_amount >= 0),
  justification text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1,
  check (q1_amount + q2_amount + q3_amount + q4_amount = quantity * unit_price)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  disbursement_code text unique,
  budget_request_id uuid references public.budget_requests(id),
  fiscal_year_id uuid not null references public.fiscal_years(id),
  organization_id uuid not null references public.organizations(id),
  owner_id uuid references public.profiles(id),
  coordinator_id uuid references public.profiles(id),
  owner_name text not null,
  coordinator_name text not null,
  title_th text not null,
  project_type text not null,
  status public.project_status not null default 'proposed',
  health public.health_status not null default 'normal',
  approved_budget numeric(18,2) not null default 0 check (approved_budget >= 0),
  disbursed_amount numeric(18,2) not null default 0 check (disbursed_amount >= 0),
  disbursement_target numeric(5,2) not null default 0 check (disbursement_target between 0 and 100),
  disbursement_state public.disbursement_status not null default 'recorded',
  progress smallint not null default 0 check (progress between 0 and 100),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1,
  archived_at timestamptz,
  check (starts_on is null or ends_on is null or starts_on <= ends_on),
  check (disbursed_amount <= approved_budget)
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, profile_id)
);

create table public.quarterly_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  fiscal_year_id uuid not null references public.fiscal_years(id),
  organization_id uuid not null references public.organizations(id),
  quarter smallint not null check (quarter between 1 and 4),
  due_at timestamptz not null,
  status public.report_status not null default 'draft',
  cumulative_progress smallint not null default 0 check (cumulative_progress between 0 and 100),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  achievement_summary text,
  problems text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1,
  unique (project_id, fiscal_year_id, quarter)
);

create table public.disbursements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  budget_line_id uuid references public.budget_lines(id),
  organization_id uuid not null references public.organizations(id),
  fiscal_year_id uuid not null references public.fiscal_years(id),
  quarter smallint not null check (quarter between 1 and 4),
  amount numeric(18,2) not null check (amount > 0),
  disbursed_on date not null,
  reference_no text,
  status public.disbursement_status not null default 'recorded',
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1
);

create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  framework text not null check (framework in ('EdPEx', 'AUN-QA', 'Internal')),
  framework_version text not null,
  fiscal_year_id uuid not null references public.fiscal_years(id),
  organization_id uuid not null references public.organizations(id),
  owner_id uuid references public.profiles(id),
  owner_name text not null,
  name text not null,
  calculation_method text not null,
  unit text not null,
  target numeric(18,4) not null,
  baseline numeric(18,4),
  direction text not null default 'higher_is_better' check (direction in ('higher_is_better', 'lower_is_better', 'range', 'boolean')),
  frequency text not null default 'annual',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1,
  unique (code, framework_version, fiscal_year_id, organization_id)
);

create table public.kpi_results (
  id uuid primary key default gen_random_uuid(),
  kpi_definition_id uuid not null references public.kpi_definitions(id) on delete cascade,
  fiscal_year_id uuid not null references public.fiscal_years(id),
  organization_id uuid not null references public.organizations(id),
  assignee_id uuid references public.profiles(id),
  quarter smallint check (quarter between 1 and 4),
  actual numeric(18,4),
  status public.kpi_result_status not null default 'not_started',
  result_state public.result_state not null default 'no_data',
  evidence_count integer not null default 0 check (evidence_count >= 0),
  explanation text,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id),
  version integer not null default 1,
  unique nulls not distinct (kpi_definition_id, fiscal_year_id, quarter)
);

create table public.approval_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  entity_type text not null,
  entity_id uuid not null,
  assignee_id uuid references public.profiles(id),
  required_role public.app_role,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revision_required', 'rejected', 'cancelled')),
  due_at timestamptz,
  acted_at timestamptz,
  comment text,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  entity_type text not null,
  entity_id uuid not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  is_verified boolean not null default false,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles(id),
  archived_at timestamptz
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  entity_type text not null,
  entity_id uuid not null,
  parent_id uuid references public.comments(id),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  archived_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  entity_type text,
  entity_id uuid,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id),
  actor_id uuid references public.profiles(id),
  actor_role public.app_role,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  old_data jsonb,
  new_data jsonb,
  reason text,
  occurred_at timestamptz not null default now()
);

create index organizations_parent_idx on public.organizations(parent_id);
create index user_roles_profile_idx on public.user_roles(profile_id, role);
create index user_scopes_profile_idx on public.user_organization_scopes(profile_id, organization_id);
create index budget_requests_org_status_idx on public.budget_requests(organization_id, status, fiscal_year_id);
create index budget_requests_owner_idx on public.budget_requests(owner_id);
create index projects_org_status_idx on public.projects(organization_id, status, fiscal_year_id);
create index projects_owner_idx on public.projects(owner_id);
create index quarterly_reports_org_due_idx on public.quarterly_reports(organization_id, due_at, status);
create index disbursements_project_quarter_idx on public.disbursements(project_id, quarter);
create index kpi_results_org_status_idx on public.kpi_results(organization_id, status, fiscal_year_id);
create index approval_tasks_assignee_idx on public.approval_tasks(assignee_id, status, due_at);
create index attachments_entity_idx on public.attachments(entity_type, entity_id);
create index comments_entity_idx on public.comments(entity_type, entity_id);
create index notifications_recipient_idx on public.notifications(recipient_id, read_at, created_at desc);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);

create or replace function private.touch_record()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  new.version := old.version + 1;
  return new;
end;
$$;

create or replace function private.touch_timestamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger touch_organizations before update on public.organizations for each row execute function private.touch_timestamp();
create trigger touch_fiscal_years before update on public.fiscal_years for each row execute function private.touch_timestamp();
create trigger touch_budget_cycles before update on public.budget_cycles for each row execute function private.touch_timestamp();
create trigger touch_budget_requests before update on public.budget_requests for each row execute function private.touch_record();
create trigger touch_budget_lines before update on public.budget_lines for each row execute function private.touch_record();
create trigger touch_projects before update on public.projects for each row execute function private.touch_record();
create trigger touch_quarterly_reports before update on public.quarterly_reports for each row execute function private.touch_record();
create trigger touch_disbursements before update on public.disbursements for each row execute function private.touch_record();
create trigger touch_kpi_definitions before update on public.kpi_definitions for each row execute function private.touch_record();
create trigger touch_kpi_results before update on public.kpi_results for each row execute function private.touch_record();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, 'ผู้ใช้งาน'), '@', 1))
  )
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

commit;
