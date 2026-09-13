import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("all operational surfaces are present", () => {
  const workspace = "app/(workspace)";
  const routes = [
    `${workspace}/projects/new/page.tsx`,
    `${workspace}/reports/quarterly/new/page.tsx`,
    `${workspace}/reports/project-results/new/page.tsx`,
    `${workspace}/disbursements/new/page.tsx`,
    `${workspace}/kpi/[id]/edit/page.tsx`,
    `${workspace}/evidence/page.tsx`,
    `${workspace}/approvals/page.tsx`,
    `${workspace}/notifications/page.tsx`,
    `${workspace}/admin/page.tsx`,
  ];
  routes.forEach((route) => assert.equal(existsSync(resolve(root, route)), true, route));
});

test("every mutating action performs an authenticated session check", () => {
  const actionFiles = [
    "features/admin/actions.ts",
    "features/approvals/actions.ts",
    "features/budget-requests/actions.ts",
    "features/disbursements/actions.ts",
    "features/disbursements/import-actions.ts",
    "features/evidence/actions.ts",
    "features/kpi/actions.ts",
    "features/notifications/actions.ts",
    "features/projects/actions.ts",
    "features/quarterly-reports/actions.ts",
    "features/project-completion-reports/actions.ts",
    "features/reports/actions.ts",
    "features/shared/period-actions.ts",
  ];
  const source = actionFiles.map(read).join("\n");
  const actions = source.match(/export async function \w+Action/g) ?? [];
  assert.equal(actions.length >= 9, true);
  assert.match(read("features/shared/server-actions.ts"), /auth\.getClaims\(\)/);
  assert.match(read("features/budget-requests/actions.ts"), /auth\.getClaims\(\)/);
  assert.equal(
    actionFiles
      .slice(1)
      .every((path) => /authenticated\(\)|requireAdmin\(\)|auth\.getClaims\(\)/.test(read(path))),
    true,
  );
  assert.match(source, /requireAdmin\(\)/);
});

test("reporting tools use authenticated data, period filters, validation, and RLS", () => {
  const queries = read("features/reports/queries.ts");
  const importActions = read("features/disbursements/import-actions.ts");
  const migration = read("supabase/migrations/202609070003_reporting_tools.sql");

  assert.match(queries, /getReportingPeriod\(\)/);
  assert.match(importActions, /importedDisbursementSchema/);
  assert.match(importActions, /fiscal_years/);
  assert.match(importActions, /\.from\("disbursements"\)\s*\.insert\(payload\)/);
  assert.match(migration, /alter table public\.report_schedules enable row level security/);
  assert.match(migration, /disbursement scope does not match project/);
  assert.match(migration, /disbursement date is outside fiscal year/);
});

test("operational migration includes workflow, budget guard, private storage, and admin access RPCs", () => {
  const sql = read("supabase/migrations/202609040003_operational_workflows.sql");
  [
    "submit_entity_for_approval",
    "act_on_approval_task",
    "guard_disbursement_budget",
    "storage.buckets",
    "review_evidence",
    "admin_update_user_access",
    "workflow_inbox",
  ].forEach((contract) => assert.equal(sql.includes(contract), true, contract));
});

test("budget submission changes status and creates its approval task atomically", () => {
  const sql = read("supabase/migrations/202609050001_correctness_and_type_safety.sql");
  assert.match(sql, /submit_budget_request_for_approval/);
  assert.match(sql, /for update;/);
  assert.match(sql, /task_id := public\.submit_entity_for_approval/);

  const action = read("features/budget-requests/actions.ts");
  assert.match(action, /rpc\("submit_budget_request_for_approval"/);
  assert.equal(
    action.includes('status: parsed.data.intent === "submit" ? "submitted" : "draft"'),
    false,
  );
});

test("budget and storage guards serialize spending and bind uploads to the signed-in user", () => {
  const sql = read("supabase/migrations/202609040003_operational_workflows.sql");
  assert.match(sql, /where p\.id = new\.project_id\s+for update;/);
  assert.match(sql, /split_part\(name, '\/', 4\) = \(select auth\.uid\(\)\)::text/);
});

test("editing a project does not silently reassign its owner identity", () => {
  const source = read("features/projects/actions.ts");
  assert.equal(source.match(/owner_id: userId/g)?.length, 1);
  assert.equal(source.match(/coordinator_id: userId/g)?.length, 1);
});

test("service role is server-only and absent from public variable names", () => {
  const adminSource = read("lib/supabase/admin.ts");
  assert.match(adminSource, /import "server-only"/);
  assert.equal(adminSource.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), false);
});

test("large operational registers use server-side pagination", () => {
  const queryFiles = [
    "features/admin/queries.ts",
    "features/approvals/queries.ts",
    "features/budget-requests/queries.ts",
    "features/disbursements/queries.ts",
    "features/evidence/queries.ts",
    "features/kpi/queries.ts",
    "features/notifications/queries.ts",
    "features/projects/queries.ts",
    "features/quarterly-reports/queries.ts",
    "features/project-completion-reports/queries.ts",
  ];
  queryFiles.forEach((path) => {
    const source = read(path);
    assert.match(source, /count:\s*"exact"/, `${path} requests a total count`);
    assert.match(source, /\.range\(from, to\)/, `${path} fetches only the requested page`);
  });
  assert.equal(existsSync(resolve(root, "components/ui/pagination-nav.tsx")), true);
});

test("evidence files bypass Server Actions and are registered by an authenticated route", () => {
  const component = read("components/modules/evidence-view.tsx");
  const actions = read("features/evidence/actions.ts");
  const route = read("app/api/evidence/route.ts");
  const nextConfig = read("next.config.ts");
  const importConfig = read("features/disbursements/import-types.ts");

  assert.match(component, /\.storage\s*\.from\(EVIDENCE_BUCKET\)\s*\.upload\(/s);
  assert.equal(actions.includes("uploadEvidenceAction"), false);
  assert.match(route, /authenticated\(\)/);
  assert.match(route, /isExpectedEvidenceStoragePath/);
  assert.match(route, /\.from\("attachments"\)/);
  assert.match(nextConfig, /bodySizeLimit:\s*"2100kb"/);
  assert.match(importConfig, /DISBURSEMENT_IMPORT_MAX_BYTES\s*=\s*2\s*\*\s*1024\s*\*\s*1024/);
  assert.equal(component.includes("uploadError.message"), false);
});

test("mutations revalidate only their affected paths", () => {
  const helper = read("features/shared/server-actions.ts");
  const actionSources = [
    "features/approvals/actions.ts",
    "features/budget-requests/actions.ts",
    "features/disbursements/actions.ts",
    "features/evidence/actions.ts",
    "features/kpi/actions.ts",
    "features/projects/actions.ts",
    "features/quarterly-reports/actions.ts",
    "features/project-completion-reports/actions.ts",
  ].map(read);

  assert.equal(helper.includes("refreshOperations"), false);
  assert.equal(
    actionSources.every((source) => source.includes("revalidateOperationPaths")),
    true,
  );
});

test("unexpected server errors are logged with an incident id and hidden from browser output", () => {
  const logger = read("lib/observability/server-logger.ts");
  const queryHelper = read("features/shared/query-utils.ts");
  const actionHelper = read("features/shared/server-actions.ts");

  assert.match(logger, /crypto\.randomUUID\(\)/);
  assert.match(logger, /\[application-error\]/);
  assert.match(queryHelper, /publicFailureMessage\(eventId\)/);
  assert.match(actionHelper, /publicFailureMessage\(reportServerError/);
  assert.equal(actionHelper.includes("return error.message"), false);
  assert.equal(existsSync(resolve(root, "instrumentation.ts")), true);
});
