export const PROJECT_COMPLETION_STATUS_LABELS: Readonly<Record<string, string>> = {
  not_started: "ยังไม่เริ่ม",
  draft: "ฉบับร่าง",
  submitted: "ส่งแล้ว",
  under_review: "รอตรวจรับรอง",
  revision_required: "ต้องแก้ไข",
  approved: "รับรองแล้ว",
  overdue: "เกินกำหนด",
};

export type ProjectCompletionReportRow = {
  projectId: string;
  reportId: string | null;
  projectCode: string;
  title: string;
  unit: string;
  fiscalYear: number;
  endsOn: string;
  dueAt: string;
  status: string;
  statusLabel: string;
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
  status: string;
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
