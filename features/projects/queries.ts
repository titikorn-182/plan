import "server-only";

import type { ProjectFormOptions, ProjectOption, ProjectRow } from "@/features/projects/types";
import type { DataResult } from "@/features/shared/types";
import { formatDate, hasValues, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import { getOrganizationsAndYears } from "@/features/shared/queries";
import { getViewer } from "@/lib/auth/viewer";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

const PROJECT_HEALTH_LABELS: Record<string, ProjectRow["health"]> = {
  normal: "ปกติ",
  watch: "เฝ้าระวัง",
  at_risk: "เสี่ยงสูง",
  delayed: "ล่าช้า",
};

export async function getProjects(page = 1): Promise<DataResult<PaginatedData<ProjectRow>>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("project_register")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);
  return result(
    {
      items: (data ?? [])
        .filter((row) =>
          hasValues(row, ["id", "code", "title", "unit", "health", "owner", "status"]),
        )
        .map((row) => ({
          uuid: row.id,
          id: row.code,
          title: row.title,
          unit: row.unit,
          budget: Number(row.budget),
          spent: Number(row.spent),
          progress: Number(row.progress),
          health: PROJECT_HEALTH_LABELS[row.health] ?? "เฝ้าระวัง",
          owner: row.owner,
          due: formatDate(row.due),
          editable: row.status === "proposed" && !row.has_pending_approval,
        })),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "projects.list",
  );
}

export async function getAccessibleProjects(): Promise<{
  data: ProjectOption[];
  error: { message: string } | null;
}> {
  const supabase = await createClient();
  const query = await supabase
    .from("projects")
    .select("id,code,title_th,organization_id,fiscal_year_id,approved_budget,disbursed_amount")
    .in("status", ["proposed", "active", "on_hold", "completed"])
    .is("archived_at", null)
    .order("code")
    .limit(QUERY_LIMITS.selectOptions);
  return {
    data: (query.data ?? []).map((row) => ({
      id: row.id,
      label: `${row.code} · ${row.title_th}`,
      organizationId: row.organization_id,
      fiscalYearId: row.fiscal_year_id,
      approvedBudget: Number(row.approved_budget),
      disbursedAmount: Number(row.disbursed_amount),
    })),
    error: query.error,
  };
}

export async function getProjectFormOptions(
  projectId?: string,
): Promise<DataResult<ProjectFormOptions | null>> {
  const [viewer, supabase, common] = await Promise.all([
    getViewer(),
    createClient(),
    getOrganizationsAndYears(),
  ]);
  const [budgets, recordResult] = await Promise.all([
    supabase
      .from("budget_requests")
      .select("id,code,title_th")
      .eq("status", "approved")
      .is("archived_at", null)
      .order("code")
      .limit(QUERY_LIMITS.selectOptions),
    projectId
      ? supabase
          .from("projects")
          .select(
            "id,version,code,organization_id,fiscal_year_id,budget_request_id,title_th,project_type,owner_name,coordinator_name,approved_budget,disbursement_target,starts_on,ends_on,status",
          )
          .eq("id", projectId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const error = common.error ?? budgets.error ?? recordResult.error;
  if (error) return result(null, error);

  const row = recordResult.data;
  const pendingApproval = row
    ? await supabase
        .from("approval_tasks")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "project")
        .eq("entity_id", row.id)
        .eq("status", "pending")
    : { count: 0, error: null };
  if (pendingApproval.error) return result(null, pendingApproval.error);

  return result({
    organizations: common.organizations,
    fiscalYears: common.fiscalYears,
    budgetRequests: (budgets.data ?? []).map((item) => ({
      id: item.id,
      label: `${item.code} · ${item.title_th}`,
    })),
    defaultOwnerName: viewer.fullName,
    record: row
      ? {
          id: row.id,
          version: row.version,
          code: row.code,
          organizationId: row.organization_id,
          fiscalYearId: row.fiscal_year_id,
          budgetRequestId: row.budget_request_id ?? "",
          title: row.title_th,
          projectType: row.project_type,
          ownerName: row.owner_name,
          coordinatorName: row.coordinator_name,
          approvedBudget: Number(row.approved_budget),
          disbursementTarget: Number(row.disbursement_target),
          startsOn: row.starts_on ?? "",
          endsOn: row.ends_on ?? "",
          status: row.status,
          pendingApproval: (pendingApproval.count ?? 0) > 0,
        }
      : null,
  });
}
