export type AppRole = "admin" | "user" | "executive" | "staff";

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  unreadNotifications: number;
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
  framework: "EdPEx" | "AUN-QA" | "Internal";
  target: number;
  actual: number | null;
  unit: string;
  status: "บรรลุ" | "เฝ้าระวัง" | "ต่ำกว่าเป้า" | "ไม่มีข้อมูล";
  workflowStatus: string;
};

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  roles: string[];
  organizationIds: string[];
};

export type AuditRow = { id: number; action: string; entityType: string; createdAt: string; actorEmail: string };

export type BudgetFormOptions = {
  organizations: { id: string; name: string }[];
  fiscalYearId: string;
  fiscalYearLabel: string;
  budgetCycleId: string;
  defaultOwnerName: string;
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
  status: string;
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
  status: string;
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
  framework: string;
  frameworkVersion: string;
  calculationMethod: string;
  unit: string;
  target: number;
  direction: "higher_is_better" | "lower_is_better" | "range" | "boolean";
  actual: number | null;
  quarter: number | null;
  explanation: string;
  status: string;
  evidenceCount: number;
};

export type EvidenceEntityOption = SelectOption & {
  entityType: "budget_request" | "project" | "quarterly_report" | "kpi_result";
  organizationId: string;
};

export type EvidenceRow = {
  id: string;
  businessId: string;
  title: string;
  unit: string;
  entityType: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  verified: boolean;
  uploadedAt: string;
};

export type WorkflowTask = {
  id: string;
  entityType: string;
  entityId: string;
  businessId: string;
  title: string;
  unit: string;
  requiredRole: string;
  status: string;
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
