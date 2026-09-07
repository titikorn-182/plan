import type { ReportingPeriod } from "@/features/shared/types";
import type { WorkbookColumn, WorkbookValue } from "@/lib/server/workbooks";

export const REPORT_KINDS = ["budget", "projects", "disbursements", "kpi"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export type ReportFormat = "xlsx" | "pdf";
export type ReportCadence = "weekly" | "monthly" | "quarterly";

export type ReportDefinition = {
  description: string;
  formats: ReportFormat[];
  kind: ReportKind;
  name: string;
};

export type ReportData = {
  columns: WorkbookColumn[];
  generatedAt: string;
  period: ReportingPeriod;
  rows: WorkbookValue[][];
  title: string;
};

export type ReportSchedule = {
  cadence: ReportCadence;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  format: ReportFormat;
  id: string;
  isActive: boolean;
  name: string;
  reportKind: ReportKind;
  sendTime: string;
};

export function isReportKind(value: string): value is ReportKind {
  return REPORT_KINDS.includes(value as ReportKind);
}
