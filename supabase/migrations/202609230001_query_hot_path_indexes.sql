begin;

-- Bound lock acquisition and index construction during deployment. Inspect live
-- table sizes first: ordinary CREATE INDEX briefly blocks writes to each table.
-- For a large/busy database, build these same indexes with CREATE INDEX
-- CONCURRENTLY outside a transaction, verify pg_index.indisvalid, then run this
-- migration. IF NOT EXISTS accommodates those successfully prebuilt indexes.
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- project_register and project editing call entity_has_pending_task once for
-- each candidate project. An assignee-first index cannot target that entity.
create index if not exists approval_tasks_pending_entity_idx
  on public.approval_tasks (entity_type, entity_id)
  where status = 'pending';

-- Match the project register's fiscal-year filter and newest-first pagination.
-- This lets PostgreSQL stop after the page is filled instead of checking RLS
-- and sorting every active project before applying LIMIT.
create index if not exists projects_active_year_updated_idx
  on public.projects (fiscal_year_id, updated_at desc)
  where archived_at is null;

commit;
