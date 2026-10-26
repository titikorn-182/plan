import "server-only";

import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { result, expectedResultError } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";

export type BudgetDecisionTask = {
  id: string;
  requiredRole: "user" | "executive";
  canAct: boolean;
};

// Called only after the detail query has verified access to this budget.
export async function getBudgetDecisionTask(
  budgetId: string,
  organizationId: string,
): Promise<DataResult<BudgetDecisionTask | null>> {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const { data, error } = await supabase
    .from("approval_tasks")
    .select("id, required_role, assignee_id")
    .eq("entity_type", "budget_request")
    .eq("entity_id", budgetId)
    .eq("organization_id", organizationId)
    .eq("status", "pending")
    .limit(2);
  if (error) return result(null, error, "approvals.budget_task");
  if (!data?.length) return result(null);
  if (data.length !== 1 || !["user", "executive"].includes(data[0].required_role ?? "")) {
    return expectedResultError(null, "งานพิจารณาไม่ตรงกับขั้นตอน กรุณาติดต่อผู้ดูแลระบบ");
  }
  const task = data[0];
  const requiredRole = task.required_role === "executive" ? "executive" : "user";
  return result({
    id: task.id,
    requiredRole,
    canAct:
      viewer.roles.includes("admin") ||
      (viewer.roles.includes(requiredRole) &&
        (!task.assignee_id || task.assignee_id === viewer.id)),
  });
}
