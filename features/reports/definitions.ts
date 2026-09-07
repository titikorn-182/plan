import type { ReportDefinition, ReportKind } from "@/features/reports/types";

export const REPORT_DEFINITIONS: readonly ReportDefinition[] = [
  {
    kind: "budget",
    name: "สรุปคำของบประมาณประจำปี",
    description: "แยกตามหน่วยงาน หมวดรายจ่าย และสถานะอนุมัติ",
    formats: ["xlsx", "pdf"],
  },
  {
    kind: "projects",
    name: "สรุปสถานะและความก้าวหน้าโครงการ",
    description: "งบประมาณ การเบิกจ่าย ความก้าวหน้า และสุขภาพโครงการ",
    formats: ["xlsx", "pdf"],
  },
  {
    kind: "disbursements",
    name: "รายงานเบิกจ่ายงบประมาณรายไตรมาส",
    description: "รายการเบิกจ่าย ผลจริง และเลขอ้างอิงตามโครงการ",
    formats: ["xlsx", "pdf"],
  },
  {
    kind: "kpi",
    name: "รายงานผล KPI EdPEx & AUN-QA",
    description: "เป้าหมาย ผลจริง สถานะ และจำนวนหลักฐาน",
    formats: ["xlsx", "pdf"],
  },
] as const;

export function getReportDefinition(kind: ReportKind): ReportDefinition {
  return REPORT_DEFINITIONS.find((report) => report.kind === kind)!;
}
