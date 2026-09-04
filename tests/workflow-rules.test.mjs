import test from "node:test";
import assert from "node:assert/strict";
import { calculateKpiResultState, isProjectPeriodValid, remainingBudget } from "../lib/operations/rules.ts";

test("project period rejects an end date before the start date", () => {
  assert.equal(isProjectPeriodValid("2026-10-01", "2027-09-30"), true);
  assert.equal(isProjectPeriodValid("2027-09-30", "2026-10-01"), false);
});

test("remaining budget never becomes negative in the UI rule", () => {
  assert.equal(remainingBudget(1_000_000, 750_000), 250_000);
  assert.equal(remainingBudget(1_000_000, 1_200_000), 0);
});

test("KPI result state follows higher-is-better thresholds", () => {
  assert.equal(calculateKpiResultState(100, 100, "higher_is_better"), "achieved");
  assert.equal(calculateKpiResultState(95, 100, "higher_is_better"), "on_track");
  assert.equal(calculateKpiResultState(80, 100, "higher_is_better"), "at_risk");
  assert.equal(calculateKpiResultState(60, 100, "higher_is_better"), "not_achieved");
});

test("KPI result state supports lower-is-better indicators", () => {
  assert.equal(calculateKpiResultState(4, 5, "lower_is_better"), "achieved");
  assert.equal(calculateKpiResultState(5.5, 5, "lower_is_better"), "on_track");
  assert.equal(calculateKpiResultState(7, 5, "lower_is_better"), "not_achieved");
});
