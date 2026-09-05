import type { CommandCenterRow, CommandCenterStatus } from "@/features/dashboard/types";
import { COMMAND_CENTER_THRESHOLDS } from "@/lib/operations/rules";

export interface CommandCenterStatusMeta {
  label: string;
  short: string;
  className: string;
}

export const COMMAND_CENTER_STATUS_META: Readonly<
  Record<CommandCenterStatus, CommandCenterStatusMeta>
> = {
  ahead: { label: "สูงกว่าแผน", short: "สูงกว่าแผน", className: "ahead" },
  onTrack: { label: "ตามแผน (±5%)", short: "ตามแผน", className: "on-track" },
  watch: { label: "ต้องติดตาม (5–15%)", short: "ต้องติดตาม", className: "watch" },
  risk: { label: "ต่ำกว่าแผน (>15%)", short: "ต่ำกว่าแผน", className: "risk" },
  noData: { label: "ยังไม่เริ่ม/ไม่มีข้อมูล", short: "ไม่มีข้อมูล", className: "no-data" },
};

export const COMMAND_CENTER_STATUSES = [
  "ahead",
  "onTrack",
  "watch",
  "risk",
  "noData",
] as const satisfies readonly CommandCenterStatus[];

export const COMMAND_CENTER_STATUS_FILTERS: ReadonlyArray<{
  value: "all" | CommandCenterStatus;
  label: string;
}> = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "ahead", label: "สูงกว่าแผน" },
  { value: "onTrack", label: "ตามแผน" },
  { value: "watch", label: "ต้องติดตาม" },
  { value: "risk", label: "ต่ำกว่าแผน" },
  { value: "noData", label: "ไม่มีข้อมูล" },
];

export interface DashboardTotals {
  approved: number;
  requested: number;
  projects: number;
  evidence: number;
  averageProgress: number;
  averageDisbursement: number;
}

export function calculateDashboardTotals(matrix: CommandCenterRow[]): DashboardTotals {
  const approved = matrix.reduce((sum, row) => sum + row.approved, 0);
  const requested = matrix.reduce((sum, row) => sum + row.requested, 0);
  const projects = matrix.reduce((sum, row) => sum + row.projectCount, 0);
  const evidence = matrix.reduce((sum, row) => sum + row.evidenceTotal, 0);
  const averageProgress =
    projects > 0
      ? matrix.reduce((sum, row) => sum + row.progress * row.projectCount, 0) / projects
      : 0;
  const averageDisbursement =
    approved > 0
      ? matrix.reduce((sum, row) => sum + row.disbursement * row.approved, 0) / approved
      : 0;
  return { approved, requested, projects, evidence, averageProgress, averageDisbursement };
}

export function getKpiCommandStatus(score: number | null): CommandCenterStatus {
  if (score === null) return "noData";
  if (score >= COMMAND_CENTER_THRESHOLDS.kpiAhead) return "ahead";
  if (score >= COMMAND_CENTER_THRESHOLDS.kpiOnTrack) return "onTrack";
  if (score >= COMMAND_CENTER_THRESHOLDS.kpiRisk) return "watch";
  return "risk";
}

export function createCommandCenterCsv(rows: CommandCenterRow[]): string {
  const header = [
    "รหัสหน่วยงาน",
    "หน่วยงาน",
    "คำของบ (บาท)",
    "อนุมัติ (บาท)",
    "ความก้าวหน้า (%)",
    "เบิกจ่าย (%)",
    "KPI (%)",
    "หลักฐานตรวจแล้ว",
    "หลักฐานทั้งหมด",
    "สถานะ",
  ];
  const body = rows.map((row) => [
    row.code,
    row.unit,
    row.requested,
    row.approved,
    row.progress.toFixed(1),
    row.disbursement.toFixed(1),
    row.kpiScore?.toFixed(1) ?? "",
    row.evidenceVerified,
    row.evidenceTotal,
    COMMAND_CENTER_STATUS_META[row.status].label,
  ]);
  return [header, ...body]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}
