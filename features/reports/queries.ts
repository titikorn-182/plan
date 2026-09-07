import "server-only";

import { getReportDefinition } from "@/features/reports/definitions";
import type { ReportData, ReportKind, ReportSchedule } from "@/features/reports/types";
import { getReportingPeriod } from "@/features/shared/queries";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";

const EXPORT_LIMIT = 5_000;

export async function getReportData(kind: ReportKind): Promise<DataResult<ReportData>> {
  const [supabase, period] = await Promise.all([createClient(), getReportingPeriod()]);
  const definition = getReportDefinition(kind);
  const base = { title: definition.name, period, generatedAt: new Date().toISOString() };

  if (kind === "budget") {
    const query = await supabase
      .from("budget_request_register")
      .select("code,title,unit,category,amount,status,updated_at")
      .eq("buddhist_year", period.buddhistYear)
      .order("code")
      .limit(EXPORT_LIMIT);
    return result(
      {
        ...base,
        columns: [
          { header: "รหัสคำขอ", width: 18 },
          { header: "ชื่อรายการ", width: 42 },
          { header: "หน่วยงาน", width: 30 },
          { header: "หมวดรายจ่าย", width: 22 },
          { header: "วงเงิน (บาท)", width: 18 },
          { header: "สถานะ", width: 18 },
          { header: "แก้ไขล่าสุด", width: 20 },
        ],
        rows: (query.data ?? []).map((row) => [
          row.code,
          row.title,
          row.unit,
          row.category,
          Number(row.amount),
          row.status,
          row.updated_at,
        ]),
      },
      query.error,
      "reports.budget",
    );
  }
  if (kind === "projects") {
    const query = await supabase
      .from("project_register")
      .select("code,title,unit,owner,budget,spent,progress,health,status,due")
      .eq("fiscal_year_id", period.fiscalYearId ?? "00000000-0000-0000-0000-000000000000")
      .order("code")
      .limit(EXPORT_LIMIT);
    return result(
      {
        ...base,
        columns: [
          { header: "รหัสโครงการ", width: 18 },
          { header: "ชื่อโครงการ", width: 42 },
          { header: "หน่วยงาน", width: 30 },
          { header: "เจ้าของโครงการ", width: 24 },
          { header: "งบอนุมัติ", width: 18 },
          { header: "เบิกจ่ายแล้ว", width: 18 },
          { header: "ความก้าวหน้า (%)", width: 18 },
          { header: "สุขภาพ", width: 16 },
          { header: "สถานะ", width: 16 },
          { header: "สิ้นสุด", width: 16 },
        ],
        rows: (query.data ?? []).map((row) => [
          row.code,
          row.title,
          row.unit,
          row.owner,
          Number(row.budget),
          Number(row.spent),
          Number(row.progress),
          row.health,
          row.status,
          row.due,
        ]),
      },
      query.error,
      "reports.projects",
    );
  }
  if (kind === "disbursements") {
    const query = await supabase
      .from("disbursements")
      .select(
        "quarter,amount,disbursed_on,reference_no,status,projects!inner(code,title_th),organizations!inner(name_th)",
      )
      .eq("fiscal_year_id", period.fiscalYearId ?? "00000000-0000-0000-0000-000000000000")
      .eq("quarter", period.quarter)
      .order("disbursed_on")
      .limit(EXPORT_LIMIT);
    return result(
      {
        ...base,
        columns: [
          { header: "รหัสโครงการ", width: 18 },
          { header: "ชื่อโครงการ", width: 42 },
          { header: "หน่วยงาน", width: 30 },
          { header: "ไตรมาส", width: 12 },
          { header: "จำนวนเงิน (บาท)", width: 20 },
          { header: "วันที่เบิกจ่าย", width: 18 },
          { header: "เลขอ้างอิง", width: 22 },
          { header: "สถานะ", width: 18 },
        ],
        rows: (query.data ?? []).map((row) => {
          const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
          const organization = Array.isArray(row.organizations)
            ? row.organizations[0]
            : row.organizations;
          return [
            project?.code ?? "—",
            project?.title_th ?? "—",
            organization?.name_th ?? "—",
            row.quarter,
            Number(row.amount),
            row.disbursed_on,
            row.reference_no,
            row.status,
          ];
        }),
      },
      query.error,
      "reports.disbursements",
    );
  }
  const query = await supabase
    .from("kpi_register")
    .select(
      "code,framework,name,owner,target,actual,unit,status,workflow_status,evidence_count,quarter",
    )
    .eq("fiscal_year_id", period.fiscalYearId ?? "00000000-0000-0000-0000-000000000000")
    .or(`quarter.is.null,quarter.eq.${period.quarter}`)
    .order("code")
    .limit(EXPORT_LIMIT);
  return result(
    {
      ...base,
      columns: [
        { header: "รหัส KPI", width: 18 },
        { header: "กรอบ", width: 14 },
        { header: "ชื่อตัวชี้วัด", width: 42 },
        { header: "ผู้รับผิดชอบ", width: 24 },
        { header: "เป้าหมาย", width: 16 },
        { header: "ผลจริง", width: 16 },
        { header: "หน่วย", width: 14 },
        { header: "ผลลัพธ์", width: 18 },
        { header: "ขั้นตอน", width: 18 },
        { header: "หลักฐาน", width: 12 },
      ],
      rows: (query.data ?? []).map((row) => [
        row.code,
        row.framework,
        row.name,
        row.owner,
        Number(row.target),
        row.actual === null ? null : Number(row.actual),
        row.unit,
        row.status,
        row.workflow_status,
        Number(row.evidence_count),
      ]),
    },
    query.error,
    "reports.kpi",
  );
}

export async function getReportSchedules(): Promise<DataResult<ReportSchedule[]>> {
  const supabase = await createClient();
  const query = await supabase
    .from("report_schedules")
    .select("id,name,report_kind,format,cadence,day_of_week,day_of_month,send_time,is_active")
    .order("created_at", { ascending: false });
  return result(
    (query.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      reportKind: row.report_kind,
      format: row.format,
      cadence: row.cadence,
      dayOfWeek: row.day_of_week,
      dayOfMonth: row.day_of_month,
      sendTime: row.send_time.slice(0, 5),
      isActive: row.is_active,
    })),
    query.error,
    "reports.schedules",
  );
}
