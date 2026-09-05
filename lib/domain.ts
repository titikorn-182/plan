import type { Enums } from "@/types/database.generated";

export type AppRole = Enums<"app_role">;
export type DocumentStatus = Enums<"document_status">;
export type ProjectStatus = Enums<"project_status">;
export type ReportStatus = Enums<"report_status">;
export type DisbursementStatus = Enums<"disbursement_status">;
export type KpiResultStatus = Enums<"kpi_result_status">;
export type KpiResultState = Enums<"result_state">;

export const APP_ROLES = ["admin", "user", "executive", "staff"] as const satisfies readonly AppRole[];
export const KPI_RESULT_STATUSES = ["not_started", "draft", "submitted", "revision_required", "verified", "overdue", "not_applicable"] as const satisfies readonly KpiResultStatus[];

export const KPI_DIRECTIONS = ["higher_is_better", "lower_is_better", "range", "boolean"] as const;
export type KpiDirection = (typeof KPI_DIRECTIONS)[number];

export const KPI_FRAMEWORKS = ["EdPEx", "AUN-QA", "Internal"] as const;
export type KpiFramework = (typeof KPI_FRAMEWORKS)[number];

export const EVIDENCE_ENTITY_TYPES = ["budget_request", "project", "quarterly_report", "kpi_result"] as const;
export type EvidenceEntityType = (typeof EVIDENCE_ENTITY_TYPES)[number];

export const WORKFLOW_STATUSES = ["pending", "approved", "revision_required", "rejected", "cancelled"] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const DECISION_STAGES = ["คำของบ", "โครงการ", "ดำเนินงาน", "เบิกจ่าย", "KPI"] as const;

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.some((role) => role === value);
}

export function isKpiResultStatus(value: unknown): value is KpiResultStatus {
  return typeof value === "string" && KPI_RESULT_STATUSES.some((status) => status === value);
}

export function isKpiDirection(value: unknown): value is KpiDirection {
  return typeof value === "string" && KPI_DIRECTIONS.some((direction) => direction === value);
}

export function isKpiFramework(value: unknown): value is KpiFramework {
  return typeof value === "string" && KPI_FRAMEWORKS.some((framework) => framework === value);
}

export function isEvidenceEntityType(value: unknown): value is EvidenceEntityType {
  return typeof value === "string" && EVIDENCE_ENTITY_TYPES.some((entityType) => entityType === value);
}

export function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return typeof value === "string" && WORKFLOW_STATUSES.some((status) => status === value);
}

export function isDecisionStage(value: unknown): value is DecisionRecord["stage"] {
  return typeof value === "string" && DECISION_STAGES.some((stage) => stage === value);
}

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  roles: AppRole[];
  role: AppRole;
  unreadNotifications: number;
};

export type ReportingPeriod = {
  fiscalYearId: string | null;
  fiscalYearLabel: string;
  buddhistYear: number;
  quarter: 1 | 2 | 3 | 4;
  quarterLabel: string;
};

export type Severity = "สูงมาก" | "สูง" | "ปานกลาง";
export type WorkState =
  | "รอพิจารณา"
  | "รออนุมัติ"
  | "ล่าช้า"
  | "รอรายงาน"
  | "เบิกจ่ายล่าช้า"
  | "รอเอกสาร"
  | "หลักฐานไม่ครบ"
  | "รอรับรอง"
  | "เสี่ยงสูง"
  | "ข้อมูลไม่ครบ";

export type DecisionRecord = {
  uuid: string;
  id: string;
  title: string;
  unit: string;
  stage: "คำของบ" | "โครงการ" | "ดำเนินงาน" | "เบิกจ่าย" | "KPI";
  state: WorkState;
  amount: string;
  severity: Severity;
  owner: string;
  coordinator: string;
  fiscalYear: string;
  projectType: string;
  progress: number;
  evidence: { name: string; date: string; verified: boolean }[];
};

export type LifecycleItem = { label: DecisionRecord["stage"]; count: string; helper: string };

export type CommandCenterStatus = "ahead" | "onTrack" | "watch" | "risk" | "noData";

export type CommandCenterRow = {
  id: string;
  code: string;
  unit: string;
  requested: number;
  approved: number;
  progress: number;
  disbursement: number;
  disbursementTarget: number;
  kpiScore: number | null;
  kpiMet: number;
  kpiTotal: number;
  evidenceVerified: number;
  evidenceTotal: number;
  projectCount: number;
  status: CommandCenterStatus;
};

export type BudgetStatus = "ฉบับร่าง" | "รอตรวจสอบ" | "รออนุมัติ" | "อนุมัติแล้ว" | "ส่งกลับแก้ไข" | "ยกเลิก";
export type BudgetRequest = {
  uuid: string;
  id: string;
  title: string;
  unit: string;
  category: string;
  amount: number;
  status: BudgetStatus;
  updated: string;
  editable: boolean;
};

export type ProjectRow = {
  uuid: string;
  id: string;
  title: string;
  unit: string;
  budget: number;
  spent: number;
  progress: number;
  health: "ปกติ" | "เฝ้าระวัง" | "เสี่ยงสูง" | "ล่าช้า";
  owner: string;
  due: string;
  editable: boolean;
};

export type QuarterlyReportRow = {
  uuid: string;
  project: string;
  title: string;
  unit: string;
  quarter: string;
  due: string;
  status: "ฉบับร่าง" | "รอตรวจ" | "เกินกำหนด" | "อนุมัติแล้ว" | "ต้องแก้ไข";
  progress: number;
  evidence: number;
};

export type DisbursementRow = {
  uuid: string;
  id: string;
  project: string;
  unit: string;
  approved: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  target: number;
  status: "ตามแผน" | "เฝ้าระวัง" | "รอเอกสาร" | "เบิกจ่ายล่าช้า";
};

export type KpiRow = {
  uuid: string;
  code: string;
  name: string;
  owner: string;
  framework: KpiFramework;
  target: number;
  actual: number | null;
  unit: string;
  status: "บรรลุ" | "เฝ้าระวัง" | "ต่ำกว่าเป้า" | "ไม่มีข้อมูล";
  workflowStatus: KpiResultStatus;
};

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  roles: AppRole[];
  organizationIds: string[];
};

export type AuditRow = { id: number; action: string; entityType: string; createdAt: string; actorEmail: string };

export type BudgetFormOptions = {
  organizations: { id: string; name: string }[];
  fiscalYearId: string;
  fiscalYearLabel: string;
  budgetCycleId: string;
  defaultOwnerName: string;
  record: BudgetFormRecord | null;
};

export type BudgetFormRecord = {
  id: string;
  code: string;
  version: number;
  title: string;
  organizationId: string;
  projectType: string;
  ownerName: string;
  rationale: string;
  amount: number;
  status: DocumentStatus;
};

export type DataResult<T> = { data: T; error: string | null };

export type SelectOption = { id: string; label: string };
export type OrganizationOption = SelectOption & { code: string };
export type FiscalYearOption = SelectOption & { buddhistYear: number };

export type ProjectFormRecord = {
  id: string;
  version: number;
  code: string;
  organizationId: string;
  fiscalYearId: string;
  budgetRequestId: string;
  title: string;
  projectType: string;
  ownerName: string;
  coordinatorName: string;
  approvedBudget: number;
  disbursementTarget: number;
  startsOn: string;
  endsOn: string;
  status: ProjectStatus;
  pendingApproval: boolean;
};

export type ProjectFormOptions = {
  organizations: OrganizationOption[];
  fiscalYears: FiscalYearOption[];
  budgetRequests: SelectOption[];
  defaultOwnerName: string;
  record: ProjectFormRecord | null;
};

export type ProjectOption = SelectOption & {
  organizationId: string;
  fiscalYearId: string;
  approvedBudget: number;
  disbursedAmount: number;
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

export type DisbursementFormOptions = {
  projects: ProjectOption[];
  fiscalYears: FiscalYearOption[];
};

export type KpiResultFormRecord = {
  id: string;
  version: number;
  code: string;
  name: string;
  framework: KpiFramework;
  frameworkVersion: string;
  calculationMethod: string;
  unit: string;
  target: number;
  direction: KpiDirection;
  actual: number | null;
  quarter: number | null;
  explanation: string;
  status: KpiResultStatus;
  evidenceCount: number;
};

export type EvidenceEntityOption = SelectOption & {
  entityType: EvidenceEntityType;
  organizationId: string;
};

export type EvidenceRow = {
  id: string;
  businessId: string;
  title: string;
  unit: string;
  entityType: EvidenceEntityType;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  verified: boolean;
  uploadedAt: string;
};

export type WorkflowTask = {
  id: string;
  entityType: EvidenceEntityType;
  entityId: string;
  businessId: string;
  title: string;
  unit: string;
  requiredRole: AppRole;
  status: WorkflowStatus;
  dueAt: string;
  createdAt: string;
  canAct: boolean;
  overdue: boolean;
};

export type NotificationRow = {
  id: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};
