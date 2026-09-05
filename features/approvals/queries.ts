import "server-only";

import type { WorkflowTask } from "@/features/approvals/types";
import type { ApprovalView } from "@/features/approvals/types";
import { isWorkflowStatus } from "@/features/approvals/types";
import { isAppRole } from "@/features/auth/types";
import { isEvidenceEntityType } from "@/features/evidence/types";
import { formatDate, hasValues, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import type { DataResult } from "@/features/shared/types";
import { getViewer } from "@/lib/auth/viewer";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export function parseApprovalView(value: string | string[] | undefined): ApprovalView {
  return (Array.isArray(value) ? value[0] : value) === "history" ? "history" : "pending";
}

export async function getWorkflowInbox(
  page = 1,
  view: ApprovalView = "pending",
): Promise<DataResult<PaginatedData<WorkflowTask>>> {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const baseQuery = supabase.from("workflow_inbox").select("*", { count: "exact" });
  const scopedQuery =
    view === "pending" ? baseQuery.eq("status", "pending") : baseQuery.neq("status", "pending");
  const { data, error, count } = await scopedQuery
    .order("created_at", { ascending: false })
    .range(from, to);
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
  return result(
    { items: tasks, pagination: createPagination(count, page, pageSize) },
    error,
    "approvals.inbox",
  );
}
