import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { ProjectProposalPdfData } from "./project-proposal-pdf-data";
import { parseProjectProposalDetails } from "./proposal-details";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";

// Use the caller's authenticated client so every lookup still observes RLS.
// Downloads do not need editor options, master data, roles or notification counts.
export async function getProjectProposalPdfData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<DataResult<ProjectProposalPdfData | null>> {
  const project = await supabase
    .from("projects")
    .select(
      "code,organization_id,fiscal_year_id,budget_request_id,title_th,project_type,owner_name,coordinator_name,approved_budget,disbursement_target,starts_on,ends_on,status,proposal_details",
    )
    .eq("id", projectId)
    .is("archived_at", null)
    .maybeSingle();
  if (project.error || !project.data) return result(null, project.error, "projects.proposal_pdf");
  const row = project.data;
  const details = parseProjectProposalDetails(row.proposal_details);
  if (!details.success) return { data: null, error: "Invalid project proposal details" };

  const [organization, year, budget] = await Promise.all([
    supabase
      .from("organizations")
      .select("name_th")
      .eq("id", row.organization_id)
      .eq("is_active", true)
      .not("id", "in", RETIRED_DEMO_FILTERS.organizations)
      .maybeSingle(),
    supabase
      .from("fiscal_years")
      .select("label")
      .eq("id", row.fiscal_year_id)
      .in("status", ["open", "closed"])
      .maybeSingle(),
    row.budget_request_id
      ? supabase
          .from("budget_requests")
          .select("code,title_th,sub_activity_name:proposal_details->>subActivityName")
          .eq("id", row.budget_request_id)
          .eq("status", "approved")
          .is("archived_at", null)
          .not("id", "in", RETIRED_DEMO_FILTERS.budgetRequests)
          .maybeSingle()
      : { data: null, error: null },
  ]);
  const error = organization.error ?? year.error ?? budget.error;
  if (error) return result(null, error, "projects.proposal_pdf_references");
  const budgetRow = budget.data;
  const budgetTitle =
    (typeof budgetRow?.sub_activity_name === "string" && budgetRow.sub_activity_name.trim()) ||
    budgetRow?.title_th;

  return result({
    code: row.code,
    title: row.title_th,
    organizationName: organization.data?.name_th ?? "-",
    fiscalYearLabel: year.data?.label ?? "-",
    budgetRequestLabel: !row.budget_request_id
      ? "ไม่ได้อ้างอิงคำของบ"
      : budgetRow
        ? `${budgetRow.code} · ${budgetTitle}`
        : "-",
    projectType: row.project_type,
    ownerName: row.owner_name,
    coordinatorName: row.coordinator_name,
    approvedBudget: Number(row.approved_budget),
    disbursementTarget: Number(row.disbursement_target),
    startsOn: row.starts_on ?? "",
    endsOn: row.ends_on ?? "",
    status: row.status,
    proposalDetails: details.data,
  });
}
