import "server-only";
import { createClient } from "@/lib/supabase/server";
import { result } from "@/features/shared/query-utils";
import type { ReportingPeriod, DataResult } from "@/features/shared/types";
import type { ReportKind } from "./types";
import type { DashboardRecord } from "./dashboard";

// Fetch every accessible row in stable pages; never summarize a silently truncated export.
async function allRows<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const response = await fetchPage(from, from + pageSize - 1);
    if (response.error) throw response.error;
    rows.push(...(response.data ?? []));
    if ((response.data?.length ?? 0) < pageSize) return rows;
  }
}

const base: DashboardRecord = {
  id: "",
  code: "—",
  title: "—",
  group: "ไม่ระบุ",
  status: "no_data",
  amount: null,
  progress: null,
  quarter: null,
  actual: null,
  target: null,
  unit: "",
  verified: false,
};

export async function getDashboardRecords(
  kind: ReportKind,
  period: ReportingPeriod,
): Promise<DataResult<DashboardRecord[]>> {
  if (!period.fiscalYearId)
    return { data: [], error: "ยังไม่ได้กำหนดปีงบประมาณ กรุณาเลือกปีจากแถบด้านบน" };
  try {
    const db = await createClient();
    if (kind === "budget") {
      const rows = await allRows((from, to) =>
        db
          .from("budget_request_register")
          .select("id,code,title,unit,amount,status")
          .eq("buddhist_year", period.buddhistYear)
          .order("id")
          .range(from, to),
      );
      return {
        error: null,
        data: rows.map((row) => ({
          ...base,
          id: row.id ?? "",
          code: row.code ?? "—",
          title: row.title ?? "—",
          group: row.unit ?? "ไม่ระบุหน่วยงาน",
          status: row.status ?? "no_data",
          amount: row.amount,
        })),
      };
    }
    if (kind === "projects") {
      const rows = await allRows((from, to) =>
        db
          .from("project_register")
          .select("id,code,title,unit,budget,progress,status")
          .eq("fiscal_year_id", period.fiscalYearId!)
          .order("id")
          .range(from, to),
      );
      return {
        error: null,
        data: rows.map((row) => ({
          ...base,
          id: row.id ?? "",
          code: row.code ?? "—",
          title: row.title ?? "—",
          group: row.unit ?? "ไม่ระบุหน่วยงาน",
          status: row.status ?? "no_data",
          amount: row.budget,
          progress: row.progress,
        })),
      };
    }
    if (kind === "disbursements") {
      const rows = await allRows((from, to) =>
        db
          .from("disbursements")
          .select(
            "id,reference_no,quarter,amount,status,projects!inner(code,title_th),organizations!inner(name_th)",
          )
          .eq("fiscal_year_id", period.fiscalYearId!)
          .order("id")
          .range(from, to),
      );
      return {
        error: null,
        data: rows.map((row) => ({
          ...base,
          id: row.id,
          code: row.reference_no || row.projects.code,
          title: row.projects.title_th,
          group: row.organizations.name_th,
          status: row.status,
          amount: row.amount,
          quarter: row.quarter,
        })),
      };
    }
    const rows = await allRows((from, to) =>
      db
        .from("kpi_register")
        .select("id,code,name,framework,status,actual,target,unit,workflow_status,quarter")
        .eq("fiscal_year_id", period.fiscalYearId!)
        .in("framework", ["EdPEx", "AUN-QA"])
        .or(`quarter.is.null,quarter.eq.${period.quarter}`)
        .order("id")
        .range(from, to),
    );
    return {
      error: null,
      data: rows.map((row) => ({
        ...base,
        id: row.id ?? "",
        code: row.code ?? "—",
        title: row.name ?? "—",
        group: row.framework ?? "—",
        status: row.status ?? "no_data",
        actual: row.actual,
        target: row.target,
        unit: row.unit ?? "",
        verified: row.workflow_status === "verified",
        quarter: row.quarter,
      })),
    };
  } catch (error) {
    return result<DashboardRecord[]>(
      [],
      { message: error instanceof Error ? error.message : "Dashboard query failed" },
      "reports.dashboard",
    );
  }
}
