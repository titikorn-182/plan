import type { Enums } from "@/types/database.generated";
import type { FiscalYearOption, ProjectOption } from "@/features/shared/types";

export type ReportStatus = Enums<"report_status">;
export type QuarterlyReportStatusLabel =
  "ฉบับร่าง" | "รอตรวจ" | "เกินกำหนด" | "อนุมัติแล้ว" | "ต้องแก้ไข";

export const REPORT_STATUS_LABELS: Readonly<Record<ReportStatus, QuarterlyReportStatusLabel>> = {
  draft: "ฉบับร่าง",
  submitted: "รอตรวจ",
  under_review: "รอตรวจ",
  revision_required: "ต้องแก้ไข",
  approved: "อนุมัติแล้ว",
  overdue: "เกินกำหนด",
};

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && value in REPORT_STATUS_LABELS;
}

export type QuarterlyReportRow = {
  uuid: string;
  project: string;
  title: string;
  unit: string;
  quarter: string;
  due: string;
  status: QuarterlyReportStatusLabel;
  progress: number;
  evidence: number;
};

export type QuarterlyReportFormRecord = {
  id: string;
  version: number;
  projectId: string;
  fiscalYearId: string;
  quarter: number;
  dueAt: string;
  progress: number;
  summary: string;
  problems: string;
  status: ReportStatus;
};

export type QuarterlyReportFormOptions = {
  projects: ProjectOption[];
  fiscalYears: FiscalYearOption[];
  record: QuarterlyReportFormRecord | null;
};
