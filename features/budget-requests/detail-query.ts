import "server-only";

import { z } from "zod";
import type {
  BudgetRequestDetail,
  BudgetRequestExpenseLine,
} from "@/features/budget-requests/detail-types";
import { parseBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import { parseBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import { isDocumentStatus } from "@/features/budget-requests/types";
import { expectedResultError, formatDate, result } from "@/features/shared/query-utils";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import type { DataResult } from "@/features/shared/types";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

const unavailableMessage = "ไม่พบคำของบประมาณหรือคุณไม่มีสิทธิ์เข้าถึง";
const invalidDetailsMessage = "ข้อมูลรายละเอียดคำขอไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ";

function isNonnegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function getBudgetRequestDetail(
  id: string,
): Promise<DataResult<BudgetRequestDetail | null>> {
  if (!z.guid().safeParse(id).success) return expectedResultError(null, unavailableMessage);

  // Keep the caller's session/RLS: a workflow task does not grant additional data access.
  // Detail reads deliberately do not depend on the selected year or an open editing cycle.
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("budget_requests")
    .select(
      "id,code,version,title_th,organization_id,fiscal_year_id,budget_cycle_id,project_type,owner_name,rationale,requested_amount,expense_breakdown,proposal_details,status,updated_at,submitted_at,organizations!budget_requests_organization_id_fkey(name_th),fiscal_years!budget_requests_fiscal_year_id_fkey(label)",
    )
    .eq("id", id)
    .is("archived_at", null)
    .not("id", "in", RETIRED_DEMO_FILTERS.budgetRequests)
    .maybeSingle();

  if (error) return result(null, error, "budget_requests.detail");
  if (!row) return expectedResultError(null, unavailableMessage);

  const proposalDetails = parseBudgetProposalDetails(row.proposal_details);
  const expenseBreakdown = parseBudgetExpenseBreakdown(row.expense_breakdown);
  const organization = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
  const fiscalYear = Array.isArray(row.fiscal_years) ? row.fiscal_years[0] : row.fiscal_years;
  if (
    !proposalDetails.success ||
    !expenseBreakdown.success ||
    !isDocumentStatus(row.status) ||
    !isNonnegativeNumber(row.requested_amount) ||
    !organization?.name_th ||
    !fiscalYear?.label
  ) {
    return expectedResultError(null, invalidDetailsMessage);
  }

  const expenseLines: BudgetRequestExpenseLine[] = [];
  // Older requests stored costs in budget_lines. Do not duplicate newer JSON expense details.
  if (proposalDetails.data.expenseItems.length === 0 && expenseBreakdown.data === null) {
    const {
      data: lines,
      error: linesError,
      count,
    } = await supabase
      .from("budget_lines")
      .select("id,expense_category,description,quantity,unit_price,total", { count: "exact" })
      .eq("budget_request_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(QUERY_LIMITS.selectOptions);

    if (linesError) return result(null, linesError, "budget_requests.detail_expense_lines");
    if (!lines || count === null || count !== lines.length) {
      return expectedResultError(
        null,
        "ไม่สามารถแสดงรายละเอียดค่าใช้จ่ายได้ครบ กรุณาติดต่อผู้ดูแลระบบ",
      );
    }
    for (const line of lines ?? []) {
      if (
        !isNonnegativeNumber(line.quantity) ||
        !isNonnegativeNumber(line.unit_price) ||
        !isNonnegativeNumber(line.total)
      ) {
        return expectedResultError(null, invalidDetailsMessage);
      }
      expenseLines.push({
        id: line.id,
        category: line.expense_category,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unit_price,
        total: line.total,
      });
    }
  }

  return result({
    id: row.id,
    code: row.code,
    version: row.version,
    title: row.title_th,
    organizationId: row.organization_id,
    organizationName: organization.name_th,
    fiscalYearId: row.fiscal_year_id,
    fiscalYearLabel: fiscalYear.label,
    budgetCycleId: row.budget_cycle_id,
    projectType: row.project_type,
    ownerName: row.owner_name,
    rationale: row.rationale,
    amount: row.requested_amount,
    expenseBreakdown: expenseBreakdown.data,
    proposalDetails: proposalDetails.data,
    status: row.status,
    updatedAt: formatDate(row.updated_at),
    submittedAt: formatDate(row.submitted_at),
    expenseLines,
  });
}
