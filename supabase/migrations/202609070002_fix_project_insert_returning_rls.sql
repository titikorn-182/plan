begin;

-- INSERT ... RETURNING also checks SELECT policies. can_access_project(id)
-- is STABLE and queries projects using the statement's original snapshot,
-- so it cannot find the row being inserted during that same statement.
-- Evaluate organization/owner/coordinator access against the candidate row.
-- Retain the existing helper for project-member access to persisted rows.
-- INSERT/UPDATE/DELETE policies, grants, and RLS remain unchanged.
alter policy projects_select on public.projects
  using (
    private.can_view_org(organization_id)
    or (
      private.current_app_role() is not null
      and (
        owner_id = (select auth.uid())
        or coordinator_id = (select auth.uid())
      )
    )
    or private.can_access_project(id)
  );

commit;
