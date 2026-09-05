import "server-only";

import { getAccessibleProjects } from "@/features/projects/queries";
import { REPORT_STATUS_LABELS } from "@/features/quarterly-reports/types";
import type {
  QuarterlyReportFormOptions,
  QuarterlyReportRow,
} from "@/features/quarterly-reports/types";
import { formatDate, hasValues, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import { getOrganizationsAndYears } from "@/features/shared/queries";
import type { DataResult } from "@/features/shared/types";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getQuarterlyReports(
  page = 1,
): Promise<DataResult<PaginatedData<QuarterlyReportRow>>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("quarterly_report_register")
    .select("*", { count: "exact" })
    .order("due_at", { ascending: true })
    .range(from, to);
  return result(
    {
      items: (data ?? [])
        .filter((row) =>
          hasValues(row, ["id", "project", "title", "unit", "quarter", "buddhist_year", "status"]),
        )
        .map((row) => ({
          uuid: row.id,
          project: row.project,
          title: row.title,
          unit: row.unit,
          quarter: `Q${row.quarter}/${row.buddhist_year}`,
          due: formatDate(row.due_at),
          status: REPORT_STATUS_LABELS[row.status] ?? "ฉบับร่าง",
          progress: Number(row.progress),
          evidence: Number(row.evidence),
        })),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "quarterly_reports.list",
  );
}

export async function getQuarterlyReportFormOptions(
  reportId?: string,
): Promise<DataResult<QuarterlyReportFormOptions | null>> {
  const [supabase, projects, common] = await Promise.all([
    createClient(),
    getAccessibleProjects(),
    getOrganizationsAndYears(),
  ]);
  const recordResult = reportId
    ? await supabase
        .from("quarterly_reports")
        .select(
          "id,version,project_id,fiscal_year_id,quarter,due_at,cumulative_progress,achievement_summary,problems,status",
        )
        .eq("id", reportId)
        .maybeSingle()
    : { data: null, error: null };
  const error = projects.error ?? common.error ?? recordResult.error;
  if (error) return result(null, error);
  const row = recordResult.data;

  return result({
    projects: projects.data,
    fiscalYears: common.fiscalYears,
    record: row
      ? {
          id: row.id,
          version: row.version,
          projectId: row.project_id,
          fiscalYearId: row.fiscal_year_id,
          quarter: row.quarter,
          dueAt: row.due_at.slice(0, 10),
          progress: Number(row.cumulative_progress),
          summary: row.achievement_summary ?? "",
          problems: row.problems ?? "",
          status: row.status,
        }
      : null,
  });
}
