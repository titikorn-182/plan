import { describe, expect, it } from "vitest";
import {
  createEmptyBudgetExpenseBreakdown,
  getBudgetExpenseTotal,
  MAX_BUDGET_REQUEST_AMOUNT,
  parseBudgetExpenseBreakdown,
} from "@/features/budget-requests/expense-categories";

describe("budget expense amounts", () => {
  it("keeps legacy totals unclassified when no breakdown is supplied", () => {
    for (const value of [null, undefined, "null"]) {
      expect(parseBudgetExpenseBreakdown(value)).toEqual({ success: true, data: null });
    }
  });

  it("normalizes form strings and empty inputs and sums exact satang", () => {
    const parsed = parseBudgetExpenseBreakdown(
      JSON.stringify({
        ...createEmptyBudgetExpenseBreakdown(),
        operating_compensation: "0.10",
        operating_services: "0.20",
        operating_materials: "",
        personnel_salary: " 1200.50 ",
      }),
    );
    expect(parsed.success).toBe(true);
    if (!parsed.success || !parsed.data) throw new Error("Expected a breakdown");
    expect(parsed.data.operating_materials).toBe(0);
    expect(parsed.data.personnel_salary).toBe(1200.5);
    expect(getBudgetExpenseTotal(parsed.data)).toBe(1200.8);
  });

  it.each([
    -1,
    "-0.01",
    1.001,
    "1.001",
    "1e3",
    "NaN",
    Infinity,
    null,
    true,
    [],
    {},
    MAX_BUDGET_REQUEST_AMOUNT + 1,
  ])("rejects invalid money %j with its category error", (invalid) => {
    expect(
      parseBudgetExpenseBreakdown({
        ...createEmptyBudgetExpenseBreakdown(),
        personnel_salary: invalid,
      }),
    ).toMatchObject({
      success: false,
      errors: { "expenseBreakdown.personnel_salary": expect.any(Array) },
    });
  });

  it.each(["{", "", [], {}, { unknown: 0 }, 10])("rejects malformed data %j", (input) => {
    expect(parseBudgetExpenseBreakdown(input)).toMatchObject({
      success: false,
      errors: { expenseBreakdown: expect.any(Array) },
    });
  });

  it("rejects omitted and additional categories", () => {
    const missing: Record<string, number> = createEmptyBudgetExpenseBreakdown();
    delete missing.operating_services;
    expect(parseBudgetExpenseBreakdown(missing).success).toBe(false);
    expect(
      parseBudgetExpenseBreakdown({ ...createEmptyBudgetExpenseBreakdown(), unknown: 0 }).success,
    ).toBe(false);
  });

  it("limits the total even when each category is within the individual limit", () => {
    expect(
      parseBudgetExpenseBreakdown({
        ...createEmptyBudgetExpenseBreakdown(),
        operating_materials: MAX_BUDGET_REQUEST_AMOUNT,
        capital_equipment: 0.01,
      }),
    ).toMatchObject({ success: false, errors: { expenseBreakdown: expect.any(Array) } });
  });
});
