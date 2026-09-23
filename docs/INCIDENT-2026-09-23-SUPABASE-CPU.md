# Supabase CPU incident — 23 September 2026

## Confirmed evidence

Project `noemwilgvrwpgqavtekm` (`plan`), PostgREST 14.5, Micro compute.
The production dashboard displayed CPU 100%, RAM 37%, 16/60 connections,
and 7,207,361 Postgres errors versus 3,257 API gateway requests in 24 hours.
These are the observed dashboard values, not a benchmark or post-fix result.

A production Postgres log at `2026-09-23T02:22:36.860Z` showed:

- SQLSTATE `40001`, message `budget request changed or is no longer editable`.
- Function `public.save_budget_request_transaction`, line 73 at RAISE.
- Application `PostgREST 14.5`, user `authenticator`, process ID `1937446`.
- Session began `2026-09-22 08:24:30 UTC`; its log line counter exceeded 8.6 million.

The SQL Editor read-only inspection subsequently found six connections executing
the same budget-save RPC, some active and some idle in an aborted transaction.
Process IDs are transient: always recheck live identity and logs before stopping one.

## Cause and fix

The application used PostgreSQL serialization-failure code `40001` for a permanent
business conflict (stale version or a non-editable record). PostgREST 14 retries
this error internally; repeated attempts cannot make the stale input valid.

[Supabase's incident guidance](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b)
documents this retry behavior and recommends a non-retryable error plus stopping
already-looping backends.

`supabase/migrations/202609230002_non_retryable_business_conflicts.sql` changes
only the explicit business-conflict code to `PT409` (HTTP 409) in the two exact
budget/project save RPC signatures. It retains each deployed function body,
version/status/ownership checks, security mode and grants. It is repeatable and
aborts on an unexpected function definition instead of guessing.

The application error translator accepts `PT409` and legacy `40001`, and asks
the user to reopen the record. It does not retry a failed save automatically.

## Production procedure

1. Confirm authorization for the production function change and interrupting the
   identified failed connections. Do not restart the entire project or upgrade
   paid compute as a substitute for fixing this loop.
2. Run the read-only checks below. Record exact backend PID, backend start time,
   role, application and RPC, and match them to repeated error logs.
3. Apply only migration `202609230002_non_retryable_business_conflicts.sql` as
   the emergency hotfix. Do not push all pending migrations or unfinished features.
4. Verify both target function bodies contain `PT409` and not custom `40001`.
5. Stop only the freshly confirmed looping backend(s). Guard termination by PID,
   backend start time, role and matching query; never terminate all connections.
   Existing in-flight requests may continue after replacing the function.
6. Check fresh logs and database CPU after the metrics collection delay. Historical
   24-hour error totals do not reset and are not proof the fault is still active.
7. Publish the application error-message change in a separately verified release.
   Do not ask a staff member to resubmit repeatedly; first check the record's
   saved version/status to avoid duplicates.

Read-only investigation (SQL Editor; no business data changes):

```sql
begin read only;
set local statement_timeout = '8s';
select pid, usename, application_name, backend_start, query_start,
       state, wait_event_type, left(query, 2500) as query
from pg_stat_activity
where datname = current_database()
  and pid <> pg_backend_pid()
  and usename = 'authenticator'
  and query like '%save_budget_request_transaction%'
order by backend_start;

select p.oid::regprocedure::text as signature,
       strpos(p.prosrc, '40001') > 0 as has_retryable_conflict,
       strpos(p.prosrc, 'PT409') > 0 as has_http_conflict
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('save_budget_request_transaction', 'save_project_transaction');
commit;
```

## Separate optimizations, not the incident remedy

- Migration `202609230001_query_hot_path_indexes.sql` adds indexes for pending
  workflow lookup and fiscal-year project pagination. Local synthetic tests show
  fewer logical block reads with identical results and role visibility. This does
  not establish a production CPU reduction; inspect table sizes before deployment.
- Request-scoped unread notification caching removes one duplicate count on the
  notifications page. Authentication and row-level security are unchanged.

## Production execution and verification

The user explicitly approved the scoped hotfix and termination of confirmed
looping backends on 23 September 2026. At approximately 09:38 Asia/Bangkok
(02:38 UTC), migration `202609230002_non_retryable_business_conflicts.sql` was
executed through the production SQL Editor. The editor returned
`Success. No rows returned`.

Follow-up read-only checks confirmed:

- Both `save_budget_request_transaction` and `save_project_transaction` contain
  `PT409` and no longer contain `40001`.
- The target save-RPC activity query returned zero rows. A separate inspection
  of all `authenticator` connections found only three idle connections: one
  `LISTEN "pgrst"` listener and two whose last command was `COMMIT`.
- The six previously observed backend PIDs (1928484, 1929275, 1937446, 1940700,
  2012731 and 2014151) were no longer present in that role's activity snapshot.
  No `pg_terminate_backend` command was executed, and no project restart was
  performed. Do not infer the mechanism of their disappearance from this check.
- API Gateway logs recorded `POST /rest/v1/rpc/save_budget_request_transaction`
  returning HTTP 200 at 09:38:55. This is an observed successful request, not a
  claim that every previously failed staff submission was recovered.
- Postgres logs for 09:39:00–09:41:11 showed exactly two normal checkpoint
  entries (`00000`), with zero errors. Earlier `40001` log entries remain in
  historical totals and must not be interpreted as new failures.

No business data was deleted, no compute upgrade was made, and no unrelated
migration was applied. Application changes and the separate index optimization
remain local; this operation did not push GitHub or deploy Vercel. The SQL Editor
execution does not register this migration in Supabase CLI migration history;
the migration is idempotent for a later controlled migration release.

The initial refreshed overview still displayed the earlier CPU 100% sample.
After the Database Health report loaded, its CPU usage headline displayed
**3.12%**, with the displayed report window ending at 09:42 Asia/Bangkok.
This is a post-fix dashboard observation, not a guarantee about future load.
Together with the idle connection snapshot and zero-error post-fix log window,
it confirms that the observed retry storm was no longer active at verification.
