import "server-only";

import type { WorkflowTask } from "@/features/approvals/types";
import { isWorkflowStatus } from "@/features/approvals/types";
import { isAppRole } from "@/features/auth/types";
import { isEvidenceEntityType } from "@/features/evidence/types";
import { formatDate, hasValues, result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export async function getWorkflowInbox(): Promise<DataResult<WorkflowTask[]>> {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const { data, error } = await supabase
    .from("workflow_inbox")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const tasks = (data ?? []).flatMap((row): WorkflowTask[] => {
    if (
      !hasValues(row, [
        "id",
        "entity_type",
        "entity_id",
        "business_id",
        "title",
        "unit",
        "required_role",
        "status",
        "created_at",
      ])
    ) {
      return [];
    }
    if (
      !isEvidenceEntityType(row.entity_type) ||
      !isAppRole(row.required_role) ||
      !isWorkflowStatus(row.status)
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        businessId: row.business_id,
        title: row.title,
        unit: row.unit,
        requiredRole: row.required_role,
        status: row.status,
        dueAt: formatDate(row.due_at),
        createdAt: formatDate(row.created_at),
        canAct:
          row.status === "pending" &&
          (viewer.roles.includes("admin") ||
            (viewer.roles.includes(row.required_role) &&
              (!row.assignee_id || row.assignee_id === viewer.id))),
        overdue:
          row.status === "pending" &&
          row.due_at !== null &&
          new Date(row.due_at).getTime() < Date.now(),
      },
    ];
  });
  return result(tasks, error);
}
