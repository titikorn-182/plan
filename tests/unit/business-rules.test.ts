import { describe, expect, it } from "vitest";
import {
  calculateKpiAttainmentPercent,
  evaluateKpiResult,
  getQuarterProgressTarget,
  isProjectPeriodValid,
  remainingBudget,
} from "@/lib/operations/rules";
import { calculateDashboardTotals, getKpiCommandStatus } from "@/features/dashboard/presentation";
import type { CommandCenterRow } from "@/features/dashboard/types";

describe("KPI calculation boundaries", () => {
  it.each([
    [100, "achieved"],
    [90, "on_track"],
    [89.99, "at_risk"],
    [75, "at_risk"],
    [74.99, "not_achieved"],
  ] as const)("higher is better: %s", (actual, state) => {
    expect(evaluateKpiResult(actual, 100, "higher_is_better")).toEqual({ success: true, state });
  });
  it.each([
    [9, "achieved"],
    [10, "on_track"],
    [12, "at_risk"],
    [12.01, "not_achieved"],
  ] as const)("lower is better: %s", (actual, state) => {
    expect(evaluateKpiResult(actual, 9, "lower_is_better")).toEqual({ success: true, state });
  });
  it.each([
    [0, 0, 100],
    [0, 1, 0],
    [1, 0, 0],
    [1, 1, 100],
  ] as const)("boolean %s / %s", (actual, target, score) => {
    expect(calculateKpiAttainmentPercent(actual, target, "boolean")).toBe(score);
    expect(evaluateKpiResult(actual, target, "boolean")).toEqual({
      success: true,
      state: score === 100 ? "achieved" : "not_achieved",
    });
  });
  it.each([NaN, Infinity, -Infinity])("rejects non-finite actual and target: %s", (value) => {
    for (const direction of ["higher_is_better", "lower_is_better", "boolean", "range"] as const) {
      expect(calculateKpiAttainmentPercent(value, 100, direction)).toBeNull();
      expect(calculateKpiAttainmentPercent(100, value, direction)).toBeNull();
      expect(evaluateKpiResult(value, 100, direction).success).toBe(false);
      expect(evaluateKpiResult(100, value, direction).success).toBe(false);
    }
  });
  it("handles missing data, zero targets, caps, and unsupported ranges", () => {
    expect(calculateKpiAttainmentPercent(null, 100, "higher_is_better")).toBeNull();
    expect(calculateKpiAttainmentPercent(0, 0, "higher_is_better")).toBe(100);
    expect(calculateKpiAttainmentPercent(1, 0, "higher_is_better")).toBe(0);
    expect(calculateKpiAttainmentPercent(500, 100, "higher_is_better")).toBe(150);
    expect(calculateKpiAttainmentPercent(-1, 100, "higher_is_better")).toBe(0);
    expect(calculateKpiAttainmentPercent(0, 10, "lower_is_better")).toBe(150);
    expect(calculateKpiAttainmentPercent(80, 100, "range")).toBeNull();
    expect(evaluateKpiResult(80, 100, "range").success).toBe(false);
    expect(evaluateKpiResult(2, 1, "boolean").success).toBe(false);
  });
});

describe("dashboard and budget totals", () => {
  it.each([
    [null, "noData"],
    [100, "ahead"],
    [99.99, "onTrack"],
    [90, "onTrack"],
    [89.99, "watch"],
    [80, "watch"],
    [79.99, "risk"],
  ] as const)("KPI command status %s", (score, status) => {
    expect(getKpiCommandStatus(score)).toBe(status);
  });
  it("weights progress by project count and spending by approved amount", () => {
    const base: CommandCenterRow = {
      id: "test",
      code: "TEST",
      unit: "หน่วยงานทดสอบ",
      requested: 100,
      approved: 100,
      progress: 20,
      disbursement: 10,
      disbursementTarget: 25,
      kpiScore: null,
      kpiMet: 0,
      kpiTotal: 0,
      evidenceVerified: 0,
      evidenceTotal: 2,
      projectCount: 1,
      status: "watch",
    };
    expect(
      calculateDashboardTotals([
        base,
        { ...base, id: "second", approved: 300, progress: 80, disbursement: 50, projectCount: 3 },
      ]),
    ).toEqual({
      requested: 200,
      approved: 400,
      projects: 4,
      evidence: 4,
      averageProgress: 65,
      averageDisbursement: 40,
    });
    expect(calculateDashboardTotals([])).toEqual({
      requested: 0,
      approved: 0,
      projects: 0,
      evidence: 0,
      averageProgress: 0,
      averageDisbursement: 0,
    });
  });
  it("covers all quarters, same-day projects, and remaining budget boundaries", () => {
    expect(([1, 2, 3, 4] as const).map(getQuarterProgressTarget)).toEqual([25, 50, 75, 100]);
    expect(isProjectPeriodValid("2026-10-01", "2026-10-01")).toBe(true);
    expect(isProjectPeriodValid("2026-10-02", "2026-10-01")).toBe(false);
    expect(isProjectPeriodValid("", "2026-10-01")).toBe(false);
    expect(remainingBudget(100, 25)).toBe(75);
    expect(remainingBudget(100, 100)).toBe(0);
    expect(remainingBudget(100, 101)).toBe(0);
  });
});
