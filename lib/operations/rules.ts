export type KpiDirection = "higher_is_better" | "lower_is_better" | "range" | "boolean";
export type KpiResultState = "achieved" | "on_track" | "at_risk" | "not_achieved";

export function isProjectPeriodValid(startsOn: string, endsOn: string) {
  return startsOn.length === 10 && endsOn.length === 10 && startsOn <= endsOn;
}

export function remainingBudget(approvedBudget: number, disbursedAmount: number) {
  return Math.max(0, approvedBudget - disbursedAmount);
}

export function calculateKpiResultState(actual: number, target: number, direction: KpiDirection): KpiResultState {
  const achieved = direction === "lower_is_better" ? actual <= target : actual >= target;
  if (achieved) return "achieved";
  const ratio = target === 0 ? 0 : direction === "lower_is_better" ? (target / Math.max(actual, 0.0001)) * 100 : (actual / target) * 100;
  if (ratio >= 90) return "on_track";
  if (ratio >= 75) return "at_risk";
  return "not_achieved";
}
