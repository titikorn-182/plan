import "server-only";

import {
  addCalendarDays,
  bangkokDateKey,
  daysUntil,
  projectCompletionDueDate,
} from "@/features/project-completion-reports/deadline";
import {
  PROJECT_COMPLETION_STATUS_LABELS,
  type ProjectCompletionReportFormOptions,
  type ProjectCompletionReportRow,
  type ProjectCompletionReportSummary,
} from "@/features/project-completion-reports/types";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import { hasValues, result } from "@/features/shared/query-utils";
import { getReportingPeriod } from "@/features/shared/queries";
import type { DataResult } from "@/features/shared/types";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getProjectCompletionReports(
  page = 1,
): Promise<
  DataResult<
    PaginatedData<ProjectCompletionReportRow> & { summary: ProjectCompletionReportSummary }
  >
> {
  const [supabase, period] = await Promise.all([createClient(), getReportingPeriod()]);
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const today = bangkokDateKey();
  const dueSoonEnd = addCalendarDays(today, 15);
  let query = supabase.from("project_completion_report_register").select("*", { count: "exact" });
  let dueSoonQuery = supabase
    .from("project_completion_report_register")
    .select("project_id", { count: "exact", head: true })
    .in("status", ["not_started", "draft", "revision_required"])
    .gte("due_at", today)
    .lte("due_at", dueSoonEnd);
  let overdueQuery = supabase
    .from("project_completion_report_register")
    .select("project_id", { count: "exact", head: true })
    .eq("status", "overdue");
  let waitingQuery = supabase
    .from("project_completion_report_register")
    .select("project_id", { count: "exact", head: true })
    .in("status", ["submitted", "under_review"]);
  let approvedQuery = supabase
    .from("project_completion_report_register")
    .select("project_id", { count: "exact", head: true })
    .eq("status", "approved");
  if (period.fiscalYearId) {
    query = query.eq("fiscal_year_id", period.fiscalYearId);
    dueSoonQuery = dueSoonQuery.eq("fiscal_year_id", period.fiscalYearId);
    overdueQuery = overdueQuery.eq("fiscal_year_id", period.fiscalYearId);
    waitingQuery = waitingQuery.eq("fiscal_year_id", period.fiscalYearId);
    approvedQuery = approvedQuery.eq("fiscal_year_id", period.fiscalYearId);
  }
  const [rows, dueSoon, overdue, waiting, approved] = await Promise.all([
    query.order("due_at", { ascending: true }).range(from, to),
    dueSoonQuery,
    overdueQuery,
    waitingQuery,
    approvedQuery,
  ]);
  const error = rows.error ?? dueSoon.error ?? overdue.error ?? waiting.error ?? approved.error;

  return result(
    {
      items: (rows.data ?? [])
        .filter((row) =>
          hasValues(row, [
            "project_id",
            "project_code",
            "title",
            "unit",
            "buddhist_year",
            "ends_on",
            "due_at",
            "status",
          ]),
        )
        .map((row) => ({
          projectId: row.project_id,
          reportId: row.id,
          projectCode: row.project_code,
          title: row.title,
          unit: row.unit,
          fiscalYear: row.buddhist_year,
          endsOn: row.ends_on,
          dueAt: row.due_at,
          status: row.status,
          statusLabel: PROJECT_COMPLETION_STATUS_LABELS[row.status] ?? row.status,
          evidenceCount: Number(row.evidence_count),
          daysRemaining: daysUntil(row.due_at),
        })),
      pagination: createPagination(rows.count, page, pageSize),
      summary: {
        dueSoon: dueSoon.count ?? 0,
        overdue: overdue.count ?? 0,
        waiting: waiting.count ?? 0,
        approved: approved.count ?? 0,
      },
    },
    error,
    "project_completion_reports.list",
  );
}

export async function getProjectCompletionReportFormOptions(
  reportId?: string,
  preferredProjectId?: string,
): Promise<DataResult<ProjectCompletionReportFormOptions | null>> {
  const supabase = await createClient();
  const [projectsResult, reportsResult, recordResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,title_th,organization_id,fiscal_year_id,ends_on")
      .in("status", ["active", "on_hold", "completed"])
      .not("ends_on", "is", null)
      .is("archived_at", null)
      .order("ends_on")
      .limit(QUERY_LIMITS.selectOptions),
    supabase
      .from("project_completion_reports")
      .select("project_id")
      .limit(QUERY_LIMITS.selectOptions),
    reportId
      ? supabase
          .from("project_completion_reports")
          .select(
            "id,version,project_id,organization_id,fiscal_year_id,due_at,status,actual_results,objective_achievement,indicator_results,beneficiary_summary,expense_summary,problems,lessons_learned,follow_up_plan,projects!inner(ends_on)",
          )
          .eq("id", reportId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const error = projectsResult.error ?? reportsResult.error ?? recordResult.error;
  if (error) return result(null, error, "project_completion_reports.form");

  const record = recordResult.data;
  const recordProject = record
    ? Array.isArray(record.projects)
      ? record.projects[0]
      : record.projects
    : null;
  const unavailable = new Set(
    (reportsResult.data ?? [])
      .map((item) => item.project_id)
      .filter((id) => id !== record?.project_id),
  );
  const projects = (projectsResult.data ?? [])
    .filter((project) => project.ends_on && !unavailable.has(project.id))
    .map((project) => ({
      id: project.id,
      label: `${project.code} · ${project.title_th}`,
      organizationId: project.organization_id,
      fiscalYearId: project.fiscal_year_id,
      endsOn: project.ends_on!,
      dueAt: projectCompletionDueDate(project.ends_on!),
    }))
    .sort((left, right) => {
      if (left.id === preferredProjectId) return -1;
      if (right.id === preferredProjectId) return 1;
      return left.endsOn.localeCompare(right.endsOn);
    });

  return result({
    projects,
    record: record
      ? {
          id: record.id,
          version: record.version,
          projectId: record.project_id,
          organizationId: record.organization_id,
          fiscalYearId: record.fiscal_year_id,
          endsOn: recordProject?.ends_on ?? "",
          dueAt: record.due_at,
          status: record.status,
          actualResults: record.actual_results ?? "",
          objectiveAchievement: record.objective_achievement ?? "",
          indicatorResults: record.indicator_results ?? "",
          beneficiarySummary: record.beneficiary_summary ?? "",
          expenseSummary: record.expense_summary ?? "",
          problems: record.problems ?? "",
          lessonsLearned: record.lessons_learned ?? "",
          followUpPlan: record.follow_up_plan ?? "",
        }
      : null,
  });
}
