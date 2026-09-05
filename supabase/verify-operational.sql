-- Read-only verification after running all migrations through
-- 202609050001_correctness_and_type_safety.sql.
select routine_schema, routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('submit_entity_for_approval', 'submit_budget_request_for_approval', 'act_on_approval_task', 'review_evidence', 'admin_update_user_access')
order by routine_name;

select table_schema, table_name
from information_schema.views
where table_schema = 'public' and table_name in ('workflow_inbox', 'evidence_register')
order by table_name;

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'evidence';

select event_object_table, trigger_name
from information_schema.triggers
where trigger_name in (
  'guard_disbursement_budget', 'sync_project_disbursed_amount', 'sync_evidence_count',
  'audit_approval_tasks', 'audit_attachments', 'audit_profiles', 'audit_user_roles', 'audit_user_scopes'
)
order by trigger_name;

select schemaname, tablename, policyname
from pg_policies
where (schemaname = 'storage' and tablename = 'objects' and policyname like 'evidence_objects_%')
   or (schemaname = 'public' and policyname in ('profiles_admin_update', 'projects_update'))
order by schemaname, tablename, policyname;
