import test from "node:test";
import assert from "node:assert/strict";
import { evaluateKpiResult, getQuarterProgressTarget, isProjectPeriodValid, remainingBudget } from "../lib/operations/rules.ts";

test("project period rejects an end date before the start date", () => {
  assert.equal(isProjectPeriodValid("2026-10-01", "2027-09-30"), true);
  assert.equal(isProjectPeriodValid("2027-09-30", "2026-10-01"), false);
});

test("remaining budget never becomes negative in the UI rule", () => {
  assert.equal(remainingBudget(1_000_000, 750_000), 250_000);
  assert.equal(remainingBudget(1_000_000, 1_200_000), 0);
});

test("KPI result state follows higher-is-better thresholds", () => {
  assert.deepEqual(evaluateKpiResult(100, 100, "higher_is_better"), { success: true, state: "achieved" });
  assert.deepEqual(evaluateKpiResult(95, 100, "higher_is_better"), { success: true, state: "on_track" });
  assert.deepEqual(evaluateKpiResult(80, 100, "higher_is_better"), { success: true, state: "at_risk" });
  assert.deepEqual(evaluateKpiResult(60, 100, "higher_is_better"), { success: true, state: "not_achieved" });
});

test("KPI result state supports lower-is-better indicators", () => {
  assert.deepEqual(evaluateKpiResult(4, 5, "lower_is_better"), { success: true, state: "achieved" });
  assert.deepEqual(evaluateKpiResult(5.5, 5, "lower_is_better"), { success: true, state: "on_track" });
  assert.deepEqual(evaluateKpiResult(7, 5, "lower_is_better"), { success: true, state: "not_achieved" });
});

test("KPI boolean values only accept 0 or 1", () => {
  assert.deepEqual(evaluateKpiResult(1, 1, "boolean"), { success: true, state: "achieved" });
  assert.deepEqual(evaluateKpiResult(0, 1, "boolean"), { success: true, state: "not_achieved" });
  assert.equal(evaluateKpiResult(2, 1, "boolean").success, false);
});

test("KPI range waits for explicit lower and upper targets", () => {
  assert.equal(evaluateKpiResult(80, 75, "range").success, false);
});

test("quarter progress targets advance in 25 percent increments", () => {
  assert.deepEqual([1, 2, 3, 4].map((quarter) => getQuarterProgressTarget(quarter)), [25, 50, 75, 100]);
});
