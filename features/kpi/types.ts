import type { Enums } from "@/types/database.generated";
import type { KpiDirection, KpiResultState } from "@/features/shared/kpi-contracts";
import type { OperationStateWithStatus } from "@/features/shared/action-state";

export { KPI_DIRECTIONS, isKpiDirection } from "@/features/shared/kpi-contracts";
export type { KpiDirection, KpiResultState } from "@/features/shared/kpi-contracts";

export type KpiResultStatus = Enums<"kpi_result_status">;
export type KpiResultActionState = OperationStateWithStatus<KpiResultStatus>;

export const KPI_RESULT_STATUSES = [
  "not_started",
  "draft",
  "submitted",
  "revision_required",
  "verified",
  "overdue",
  "not_applicable",
] as const satisfies readonly KpiResultStatus[];
export const KPI_FRAMEWORKS = ["EdPEx", "AUN-QA", "Internal"] as const;
export type KpiFramework = (typeof KPI_FRAMEWORKS)[number];
export type KpiStatusLabel = "บรรลุ" | "เฝ้าระวัง" | "ต่ำกว่าเป้า" | "ไม่มีข้อมูล";

export const KPI_STATUS_LABELS: Readonly<Record<KpiResultState, KpiStatusLabel>> = {
  achieved: "บรรลุ",
  on_track: "เฝ้าระวัง",
  at_risk: "ต่ำกว่าเป้า",
  not_achieved: "ต่ำกว่าเป้า",
  no_data: "ไม่มีข้อมูล",
};

export function isKpiResultState(value: unknown): value is KpiResultState {
  return typeof value === "string" && value in KPI_STATUS_LABELS;
}

export function isKpiResultStatus(value: unknown): value is KpiResultStatus {
  return typeof value === "string" && KPI_RESULT_STATUSES.some((status) => status === value);
}

export function isKpiFramework(value: unknown): value is KpiFramework {
  return typeof value === "string" && KPI_FRAMEWORKS.some((framework) => framework === value);
}

export type KpiRow = {
  uuid: string;
  code: string;
  name: string;
  owner: string;
  framework: KpiFramework;
  target: number;
  actual: number | null;
  unit: string;
  status: KpiStatusLabel;
  workflowStatus: KpiResultStatus;
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
