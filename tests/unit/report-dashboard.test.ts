import { describe, expect, it } from "vitest";
import { summarizeDashboard, type DashboardRecord } from "@/features/reports/dashboard";

const row: DashboardRecord = {
  id: "1",
  code: "P1",
  title: "Test",
  group: "Unit",
  status: "active",
  amount: 100,
  progress: null,
  quarter: 1,
  actual: null,
  target: null,
  unit: "",
  verified: false,
};

describe("report dashboard aggregation", () => {
  it("does not turn missing progress into zero", () => {
    expect(
      summarizeDashboard("projects", [row, { ...row, id: "2", progress: 80 }]).averageProgress,
    ).toBe(80);
    expect(summarizeDashboard("projects", []).averageProgress).toBeNull();
  });
  it("separates recorded totals from reconciled amounts across all quarters", () => {
    const summary = summarizeDashboard("disbursements", [
      { ...row, status: "pending_docs" },
      { ...row, id: "2", amount: 250, quarter: 4, status: "reconciled" },
    ]);
    expect(summary.totalAmount).toBe(350);
    expect(summary.reconciled).toBe(250);
    expect(summary.quarters.map((item) => item.value)).toEqual([100, 0, 0, 250]);
  });
  it("does not count missing actual as achieved or add different KPI units", () => {
    const summary = summarizeDashboard("kpi", [
      { ...row, group: "EdPEx", status: "achieved" },
      { ...row, id: "2", group: "AUN-QA", actual: 0, status: "achieved", verified: true },
    ]);
    expect(summary.achieved).toBe(1);
    expect(summary.verified).toBe(1);
    expect(summary.groups.map((item) => item.value)).toEqual([1, 1]);
    expect(summary.statuses).toContainEqual({ label: "ไม่มีผลประเมิน", value: 1 });
  });
  it("includes all request statuses and does not mislabel them as approved budget", () => {
    const summary = summarizeDashboard("budget", [
      { ...row, status: "draft" },
      { ...row, id: "2", status: "cancelled", amount: 50 },
    ]);
    expect(summary.totalAmount).toBe(150);
    expect(summary.count).toBe(2);
    expect(summary.statuses).toContainEqual({ label: "ยกเลิก", value: 1 });
  });
});
