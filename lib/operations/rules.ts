import type { KpiDirection, KpiResultState } from "@/features/kpi/types";

export const COMMAND_CENTER_THRESHOLDS = {
  riskGap: 15,
  watchGap: 5,
  aheadGap: 15,
  kpiRisk: 80,
  kpiOnTrack: 90,
  kpiAhead: 100,
} as const;

export function getQuarterProgressTarget(quarter: 1 | 2 | 3 | 4) {
  return quarter * 25;
}

export type KpiEvaluation =
  | { success: true; state: Exclude<KpiResultState, "no_data"> }
  | { success: false; message: string };

export function isProjectPeriodValid(startsOn: string, endsOn: string) {
  return startsOn.length === 10 && endsOn.length === 10 && startsOn <= endsOn;
}

export function remainingBudget(approvedBudget: number, disbursedAmount: number) {
  return Math.max(0, approvedBudget - disbursedAmount);
}

export function calculateKpiAttainmentPercent(
  actual: number | null,
  target: number,
  direction: KpiDirection,
): number | null {
  if (actual === null || !Number.isFinite(actual) || !Number.isFinite(target)) return null;
  if (direction === "range") return null;
  if (direction === "boolean") {
    if (![0, 1].includes(actual) || ![0, 1].includes(target)) return null;
    return actual === target ? 100 : 0;
  }
  if (target === 0) return actual === 0 ? 100 : 0;
  const ratio =
    direction === "lower_is_better" ? target / Math.max(actual, 0.0001) : actual / target;
  return Math.min(150, Math.max(0, ratio * 100));
}

export function evaluateKpiResult(
  actual: number,
  target: number,
  direction: KpiDirection,
): KpiEvaluation {
  if (direction === "range") {
    return {
      success: false,
      message: "ตัวชี้วัดแบบช่วงต้องกำหนดค่าต่ำสุดและค่าสูงสุดก่อนบันทึกผล",
    };
  }

  if (direction === "boolean") {
    if (![0, 1].includes(actual) || ![0, 1].includes(target)) {
      return { success: false, message: "ตัวชี้วัดแบบใช่/ไม่ใช่ต้องใช้ค่า 1 หรือ 0 เท่านั้น" };
    }
    return { success: true, state: actual === target ? "achieved" : "not_achieved" };
  }

  const achieved = direction === "lower_is_better" ? actual <= target : actual >= target;
  if (achieved) return { success: true, state: "achieved" };
  const ratio = calculateKpiAttainmentPercent(actual, target, direction) ?? 0;
  if (ratio >= 90) return { success: true, state: "on_track" };
  if (ratio >= 75) return { success: true, state: "at_risk" };
  return { success: true, state: "not_achieved" };
}
