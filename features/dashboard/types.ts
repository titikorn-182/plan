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

export const DECISION_STATE_LABELS: Readonly<Record<string, WorkState>> = {
  draft: "ข้อมูลไม่ครบ",
  submitted: "รอพิจารณา",
  under_review: "รอพิจารณา",
  pending_approval: "รออนุมัติ",
  revision_required: "ข้อมูลไม่ครบ",
  proposed: "รออนุมัติ",
  active: "รอรายงาน",
  on_hold: "เสี่ยงสูง",
  normal: "รอรายงาน",
  watch: "รอรายงาน",
  at_risk: "เสี่ยงสูง",
  delayed: "ล่าช้า",
  pending_docs: "รอเอกสาร",
  submitted_kpi: "รอรับรอง",
  overdue: "ข้อมูลไม่ครบ",
  no_data: "ข้อมูลไม่ครบ",
  not_achieved: "หลักฐานไม่ครบ",
};

export const SEVERITY_LABELS: Readonly<Record<string, Severity>> = {
  medium: "ปานกลาง",
  high: "สูง",
  critical: "สูงมาก",
};

export const DECISION_STAGES = ["คำของบ", "โครงการ", "ดำเนินงาน", "เบิกจ่าย", "KPI"] as const;

export type DecisionRecord = {
  uuid: string;
  id: string;
  title: string;
  unit: string;
  stage: (typeof DECISION_STAGES)[number];
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

export function isDecisionStage(value: unknown): value is DecisionRecord["stage"] {
  return typeof value === "string" && DECISION_STAGES.some((stage) => stage === value);
}

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
