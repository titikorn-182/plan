import "server-only";

import { BUDGET_STATUS_LABELS } from "@/features/budget-requests/types";
import type { BudgetFormOptions, BudgetRequest } from "@/features/budget-requests/types";
import type { DataResult } from "@/features/shared/types";
import { expectedResultError, formatDate, hasValues, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import { getViewer } from "@/lib/auth/viewer";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getBudgetRequests(
  page = 1,
): Promise<DataResult<PaginatedData<BudgetRequest>>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("budget_request_register")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);
  return result(
    {
      items: (data ?? [])
        .filter((row) => hasValues(row, ["id", "code", "title", "unit", "category", "status"]))
        .map((row) => ({
          uuid: row.id,
          id: row.code,
          title: row.title,
          unit: row.unit,
          category: row.category,
          amount: Number(row.amount),
          status: BUDGET_STATUS_LABELS[row.status] ?? "ฉบับร่าง",
          updated: formatDate(row.updated_at),
          editable: ["draft", "revision_required"].includes(row.status),
        })),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "budget_requests.list",
  );
}

export async function getBudgetFormOptions(
  budgetRequestId?: string,
): Promise<DataResult<BudgetFormOptions | null>> {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const currentTimestamp = new Date().toISOString();
  const [
    { data: organizations, error: orgError },
    { data: cycles, error: cycleError },
    recordResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id,name_th").eq("is_active", true).order("name_th"),
    supabase
      .from("budget_cycles")
      .select("id,fiscal_year_id,fiscal_years!inner(label,status)")
      .eq("status", "open")
      .lte("opens_at", currentTimestamp)
      .gte("closes_at", currentTimestamp)
      .order("closes_at")
      .limit(1),
    budgetRequestId
      ? supabase
          .from("budget_requests")
          .select(
            "id,code,version,title_th,organization_id,project_type,owner_name,rationale,requested_amount,status,fiscal_year_id,budget_cycle_id,fiscal_years!budget_requests_fiscal_year_id_fkey(label),organizations!budget_requests_organization_id_fkey(name_th)",
          )
          .eq("id", budgetRequestId)
          .is("archived_at", null)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const error = orgError ?? cycleError ?? recordResult.error;
  if (error) return result(null, error);
  if (budgetRequestId && !recordResult.data) {
    return expectedResultError(null, "ไม่พบคำของบประมาณหรือคุณไม่มีสิทธิ์เข้าถึง");
  }
  const cycle = cycles?.[0];
  const recordRow = recordResult.data;
  if (!recordRow && !cycle) {
    return expectedResultError(null, "ยังไม่มีรอบรับคำของบประมาณที่เปิดใช้งาน");
  }

  const cycleFiscal = cycle
    ? Array.isArray(cycle.fiscal_years)
      ? cycle.fiscal_years[0]
      : cycle.fiscal_years
    : null;
  const recordFiscal = recordRow
    ? Array.isArray(recordRow.fiscal_years)
      ? recordRow.fiscal_years[0]
      : recordRow.fiscal_years
    : null;
  const recordOrganization = recordRow
    ? Array.isArray(recordRow.organizations)
      ? recordRow.organizations[0]
      : recordRow.organizations
    : null;
  const organizationOptions = (organizations ?? []).map((item) => ({
    id: item.id,
    name: item.name_th,
  }));
  if (
    recordRow &&
    recordOrganization &&
    !organizationOptions.some((item) => item.id === recordRow.organization_id)
  ) {
    organizationOptions.push({
      id: recordRow.organization_id,
      name: `${recordOrganization.name_th} (ปิดใช้งาน)`,
    });
  }

  return result({
    organizations: organizationOptions,
    fiscalYearId: recordRow?.fiscal_year_id ?? cycle!.fiscal_year_id,
    fiscalYearLabel: recordFiscal?.label ?? cycleFiscal?.label ?? "—",
    budgetCycleId: recordRow?.budget_cycle_id ?? cycle!.id,
    defaultOwnerName: viewer.fullName,
    record: recordRow
      ? {
          id: recordRow.id,
          code: recordRow.code,
          version: recordRow.version,
          title: recordRow.title_th,
          organizationId: recordRow.organization_id,
          projectType: recordRow.project_type,
          ownerName: recordRow.owner_name,
          rationale: recordRow.rationale,
          amount: Number(recordRow.requested_amount),
          status: recordRow.status,
        }
      : null,
  });
}
