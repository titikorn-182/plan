import type { Enums } from "@/types/database.generated";

export type KpiResultState = Enums<"result_state">;

export const KPI_DIRECTIONS = ["higher_is_better", "lower_is_better", "range", "boolean"] as const;

export type KpiDirection = (typeof KPI_DIRECTIONS)[number];

export function isKpiDirection(value: unknown): value is KpiDirection {
  return typeof value === "string" && KPI_DIRECTIONS.some((direction) => direction === value);
}
