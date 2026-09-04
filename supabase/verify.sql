-- Read-only deployment checks. Run in SQL Editor after migrations and seed.

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'organizations', 'profiles', 'user_roles', 'user_organization_scopes',
    'fiscal_years', 'budget_cycles', 'budget_requests', 'budget_lines', 'projects',
    'project_members', 'quarterly_reports', 'disbursements', 'kpi_definitions',
    'kpi_results', 'approval_tasks', 'attachments', 'comments', 'notifications', 'audit_events'
  )
order by c.relname;

select tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

select c.relname as view_name, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and c.relname in (
    'budget_request_register', 'project_register', 'quarterly_report_register',
    'disbursement_register', 'kpi_register', 'decision_queue'
  )
order by c.relname;

select
  (select count(*) from public.organizations) as organizations,
  (select count(*) from public.budget_requests) as budget_requests,
  (select count(*) from public.projects) as projects,
  (select count(*) from public.quarterly_reports) as quarterly_reports,
  (select count(*) from public.kpi_results) as kpi_results;
