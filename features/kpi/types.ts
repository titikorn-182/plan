import type { Enums } from "@/types/database.generated";

export type KpiResultStatus = Enums<"kpi_result_status">;
export type KpiResultState = Enums<"result_state">;

export const KPI_RESULT_STATUSES = [
  "not_started",
  "draft",
  "submitted",
  "revision_required",
  "verified",
  "overdue",
  "not_applicable",
] as const satisfies readonly KpiResultStatus[];
export const KPI_DIRECTIONS = ["higher_is_better", "lower_is_better", "range", "boolean"] as const;
export type KpiDirection = (typeof KPI_DIRECTIONS)[number];
export const KPI_FRAMEWORKS = ["EdPEx", "AUN-QA", "Internal"] as const;
export type KpiFramework = (typeof KPI_FRAMEWORKS)[number];
export type KpiStatusLabel = "บรรลุ" | "เฝ้าระวัง" | "ต่ำกว่าเป้า" | "ไม่มีข้อมูล";

export const KPI_STATUS_LABELS: Readonly<Record<string, KpiStatusLabel>> = {
  achieved: "บรรลุ",
  on_track: "เฝ้าระวัง",
  at_risk: "ต่ำกว่าเป้า",
  not_achieved: "ต่ำกว่าเป้า",
  no_data: "ไม่มีข้อมูล",
};

export function isKpiResultStatus(value: unknown): value is KpiResultStatus {
  return typeof value === "string" && KPI_RESULT_STATUSES.some((status) => status === value);
}

export function isKpiDirection(value: unknown): value is KpiDirection {
  return typeof value === "string" && KPI_DIRECTIONS.some((direction) => direction === value);
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
