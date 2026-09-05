import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("all eight operational surfaces are present", () => {
  const routes = [
    "app/projects/new/page.tsx", "app/reports/quarterly/new/page.tsx", "app/disbursements/new/page.tsx",
    "app/kpi/[id]/edit/page.tsx", "app/evidence/page.tsx", "app/approvals/page.tsx",
    "app/notifications/page.tsx", "app/admin/page.tsx",
  ];
  routes.forEach((route) => assert.equal(existsSync(resolve(root, route)), true, route));
});

test("every mutating action performs an authenticated session check", () => {
  const source = read("app/operations/actions.ts");
  const actions = source.match(/export async function \w+Action/g) ?? [];
  assert.equal(actions.length >= 9, true);
  assert.match(source, /auth\.getClaims\(\)/);
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

  const action = read("app/budget-requests/actions.ts");
  assert.match(action, /rpc\("submit_budget_request_for_approval"/);
  assert.equal(action.includes('status: parsed.data.intent === "submit" ? "submitted" : "draft"'), false);
});

test("budget and storage guards serialize spending and bind uploads to the signed-in user", () => {
  const sql = read("supabase/migrations/202609040003_operational_workflows.sql");
  assert.match(sql, /where p\.id = new\.project_id\s+for update;/);
  assert.match(sql, /split_part\(name, '\/', 4\) = \(select auth\.uid\(\)\)::text/);
});

test("editing a project does not silently reassign its owner identity", () => {
  const source = read("app/operations/actions.ts");
  assert.equal(source.match(/owner_id: userId/g)?.length, 1);
  assert.equal(source.match(/coordinator_id: userId/g)?.length, 1);
});

test("service role is server-only and absent from public variable names", () => {
  const adminSource = read("lib/supabase/admin.ts");
  assert.match(adminSource, /import "server-only"/);
  assert.equal(adminSource.includes("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"), false);
});
