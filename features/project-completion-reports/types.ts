import type { Enums } from "@/types/database.generated";
import type { OperationStateWithStatus } from "@/features/shared/action-state";

export type ProjectCompletionReportStatus = Enums<"report_status">;
export type ProjectCompletionReportActionState =
  OperationStateWithStatus<ProjectCompletionReportStatus>;
export type ProjectCompletionStatus = ProjectCompletionReportStatus | "not_started";
export type ProjectCompletionStatusLabel =
  | "ยังไม่เริ่ม"
  | "ฉบับร่าง"
  | "ส่งแล้ว"
  | "รอตรวจรับรอง"
  | "ต้องแก้ไข"
  | "รับรองแล้ว"
  | "เกินกำหนด";

export const PROJECT_COMPLETION_STATUS_LABELS: Readonly<
  Record<ProjectCompletionStatus, ProjectCompletionStatusLabel>
> = {
  not_started: "ยังไม่เริ่ม",
  draft: "ฉบับร่าง",
  submitted: "ส่งแล้ว",
  under_review: "รอตรวจรับรอง",
  revision_required: "ต้องแก้ไข",
  approved: "รับรองแล้ว",
  overdue: "เกินกำหนด",
};

export function isProjectCompletionStatus(value: unknown): value is ProjectCompletionStatus {
  return typeof value === "string" && value in PROJECT_COMPLETION_STATUS_LABELS;
}

export type ProjectCompletionReportRow = {
  projectId: string;
  reportId: string | null;
  projectCode: string;
  title: string;
  unit: string;
  fiscalYear: number;
  endsOn: string;
  dueAt: string;
  status: ProjectCompletionStatus;
  statusLabel: ProjectCompletionStatusLabel;
  evidenceCount: number;
  daysRemaining: number;
};

export type ProjectCompletionReportSummary = {
  dueSoon: number;
  overdue: number;
  waiting: number;
  approved: number;
};

export type ProjectCompletionOption = {
  id: string;
  label: string;
  organizationId: string;
  fiscalYearId: string;
  endsOn: string;
  dueAt: string;
};

export type ProjectCompletionReportRecord = {
  id: string;
  version: number;
  projectId: string;
  organizationId: string;
  fiscalYearId: string;
  endsOn: string;
  dueAt: string;
  status: ProjectCompletionReportStatus;
  actualResults: string;
  objectiveAchievement: string;
  indicatorResults: string;
  beneficiarySummary: string;
  expenseSummary: string;
  problems: string;
  lessonsLearned: string;
  followUpPlan: string;
};

export type ProjectCompletionReportFormOptions = {
  projects: ProjectCompletionOption[];
  record: ProjectCompletionReportRecord | null;
};
