import type { Enums } from "@/types/database.generated";
import type { ProjectOption } from "@/features/projects/types";
import type { FiscalYearOption } from "@/features/shared/types";

export type ReportStatus = Enums<"report_status">;
export type QuarterlyReportStatusLabel =
  "ฉบับร่าง" | "รอตรวจ" | "เกินกำหนด" | "อนุมัติแล้ว" | "ต้องแก้ไข";

export const REPORT_STATUS_LABELS: Readonly<Record<string, QuarterlyReportStatusLabel>> = {
  draft: "ฉบับร่าง",
  submitted: "รอตรวจ",
  under_review: "รอตรวจ",
  revision_required: "ต้องแก้ไข",
  approved: "อนุมัติแล้ว",
  overdue: "เกินกำหนด",
};

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
