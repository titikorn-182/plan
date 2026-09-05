import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("all eight operational surfaces are present", () => {
  const workspace = "app/(workspace)";
  const routes = [
    `${workspace}/projects/new/page.tsx`, `${workspace}/reports/quarterly/new/page.tsx`,
    `${workspace}/disbursements/new/page.tsx`, `${workspace}/kpi/[id]/edit/page.tsx`,
    `${workspace}/evidence/page.tsx`, `${workspace}/approvals/page.tsx`,
    `${workspace}/notifications/page.tsx`, `${workspace}/admin/page.tsx`,
  ];
  routes.forEach((route) => assert.equal(existsSync(resolve(root, route)), true, route));
});

test("every mutating action performs an authenticated session check", () => {
  const actionFiles = [
    "features/admin/actions.ts",
    "features/approvals/actions.ts",
    "features/budget-requests/actions.ts",
    "features/disbursements/actions.ts",
    "features/evidence/actions.ts",
    "features/kpi/actions.ts",
    "features/notifications/actions.ts",
    "features/projects/actions.ts",
    "features/quarterly-reports/actions.ts",
  ];
  const source = actionFiles.map(read).join("\n");
  const actions = source.match(/export async function \w+Action/g) ?? [];
  assert.equal(actions.length >= 9, true);
  assert.match(read("features/shared/server-actions.ts"), /auth\.getClaims\(\)/);
  assert.match(read("features/budget-requests/actions.ts"), /auth\.getClaims\(\)/);
  assert.equal(
    actionFiles.slice(1).every((path) => /authenticated\(\)|requireAdmin\(\)|auth\.getClaims\(\)/.test(read(path))),
    true,
  );
  assert.match(source, /requireAdmin\(\)/);
});

test("operational migration includes workflow, budget guard, private storage, and admin access RPCs", () => {
  const sql = read("supabase/migrations/202609040003_operational_workflows.sql");
  ["submit_entity_for_approval", "act_on_approval_task", "guard_disbursement_budget", "storage.buckets", "review_evidence", "admin_update_user_access", "workflow_inbox"].forEach((contract) => assert.equal(sql.includes(contract), true, contract));
});

test("budget submission changes status and creates its approval task atomically", () => {
  const sql = read("supabase/migrations/202609050001_correctness_and_type_safety.sql");
  assert.match(sql, /submit_budget_request_for_approval/);
  assert.match(sql, /for update;/);
  assert.match(sql, /task_id := public\.submit_entity_for_approval/);

  const action = read("features/budget-requests/actions.ts");
  assert.match(action, /rpc\("submit_budget_request_for_approval"/);
  assert.equal(action.includes('status: parsed.data.intent === "submit" ? "submitted" : "draft"'), false);
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
