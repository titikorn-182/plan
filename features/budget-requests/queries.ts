import "server-only";

import { BUDGET_STATUS_LABELS } from "@/features/budget-requests/types";
import type { BudgetFormOptions, BudgetRequest } from "@/features/budget-requests/types";
import { parseBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import { parseBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import type { DataResult } from "@/features/shared/types";
import { expectedResultError, formatDate, hasValues, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";
import { getReportingPeriod } from "@/features/shared/queries";
import {
  BUDGET_REQUEST_ORGANIZATION_NAMES,
  getBudgetRequestOrganizationOrder,
} from "@/features/budget-requests/organization-options";
import {
  BUDGET_REQUEST_CYCLE_NAMES,
  BUDGET_REQUEST_FISCAL_YEARS,
} from "@/features/budget-requests/fiscal-year-options";

export async function getBudgetRequests(
  page = 1,
): Promise<DataResult<PaginatedData<BudgetRequest>>> {
  const [supabase, period] = await Promise.all([createClient(), getReportingPeriod()]);
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("budget_request_register")
    .select("*", { count: "exact" })
    .eq("buddhist_year", period.buddhistYear)
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
  const supabase = await createClient();
  const [
    { data: organizations, error: orgError },
    { data: cycles, error: cycleError },
    recordResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id,name_th")
      .eq("is_active", true)
      .in("name_th", BUDGET_REQUEST_ORGANIZATION_NAMES),
    supabase
      .from("budget_cycles")
      .select("id,name,fiscal_year_id,fiscal_years!inner(label,status,buddhist_year)")
      .eq("status", "open")
      .in("name", BUDGET_REQUEST_CYCLE_NAMES),
    budgetRequestId
      ? supabase
          .from("budget_requests")
          .select(
            "id,code,version,title_th,organization_id,project_type,owner_name,rationale,requested_amount,expense_breakdown,proposal_details,status,fiscal_year_id,budget_cycle_id,fiscal_years!budget_requests_fiscal_year_id_fkey(label,buddhist_year),organizations!budget_requests_organization_id_fkey(name_th)",
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
  const recordRow = recordResult.data;
  const expenseBreakdown = parseBudgetExpenseBreakdown(recordRow?.expense_breakdown);
  if (!expenseBreakdown.success) {
    return expectedResultError(
      null,
      "ข้อมูลหมวดค่าใช้จ่ายของคำขอไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ",
    );
  }
  const proposalDetails = parseBudgetProposalDetails(recordRow?.proposal_details);
  if (!proposalDetails.success) {
    return expectedResultError(null, "ข้อมูลรายละเอียดคำขอไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ");
  }
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
  const organizationOptions = (organizations ?? [])
    .toSorted(
      (left, right) =>
        getBudgetRequestOrganizationOrder(left.name_th) -
        getBudgetRequestOrganizationOrder(right.name_th),
    )
    .map((item) => ({
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

  const cyclesByYear = new Map<number, { fiscalYearId: string; budgetCycleId: string }>();
  for (const cycle of cycles ?? []) {
    const fiscalYear = Array.isArray(cycle.fiscal_years)
      ? cycle.fiscal_years[0]
      : cycle.fiscal_years;
    if (fiscalYear && !cyclesByYear.has(fiscalYear.buddhist_year)) {
      cyclesByYear.set(fiscalYear.buddhist_year, {
        fiscalYearId: cycle.fiscal_year_id,
        budgetCycleId: cycle.id,
      });
    }
  }
  const fiscalYears = BUDGET_REQUEST_FISCAL_YEARS.flatMap((configuredYear) => {
    const cycle = cyclesByYear.get(configuredYear.buddhistYear);
    return cycle
      ? [
          {
            id: cycle.fiscalYearId,
            label: configuredYear.label,
            budgetCycleId: cycle.budgetCycleId,
          },
        ]
      : [];
  });

  if (!recordRow && fiscalYears.length !== BUDGET_REQUEST_FISCAL_YEARS.length) {
    return expectedResultError(
      null,
      "ข้อมูลปีงบประมาณ 2570–2572 ยังไม่ครบ กรุณาให้ผู้ดูแลระบบตั้งค่ารอบคำขอ",
    );
  }

  if (recordRow && !fiscalYears.some((item) => item.id === recordRow.fiscal_year_id)) {
    fiscalYears.push({
      id: recordRow.fiscal_year_id,
      label: recordFiscal?.label ?? "ปีงบประมาณของรายการเดิม",
      budgetCycleId: recordRow.budget_cycle_id,
    });
  }

  return result({
    organizations: organizationOptions,
    fiscalYears,
    record: recordRow
      ? {
          id: recordRow.id,
          code: recordRow.code,
          version: recordRow.version,
          title: recordRow.title_th,
          organizationId: recordRow.organization_id,
          fiscalYearId: recordRow.fiscal_year_id,
          budgetCycleId: recordRow.budget_cycle_id,
          projectType: recordRow.project_type,
          ownerName: recordRow.owner_name,
          rationale: recordRow.rationale,
          amount: Number(recordRow.requested_amount),
          expenseBreakdown: expenseBreakdown.data,
          proposalDetails: proposalDetails.data,
          status: recordRow.status,
        }
      : null,
  });
}
