import { describe, expect, it } from "vitest";
import {
  BUDGET_REQUEST_FUNDING_SOURCE_DETAIL_OPTIONS,
  BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS,
  BUDGET_REQUEST_MISSION_OPTIONS,
  BUDGET_REQUEST_PROJECT_TYPE_OPTIONS,
  BUDGET_REQUEST_SOURCE_SELECT_KEYS,
  BUDGET_REQUEST_STRATEGY_OPTIONS,
  isBudgetRequestSourceOption,
  normalizeBudgetRequestSourceOption,
} from "@/features/budget-requests/source-options";
import { TEST_BUDGET_SOURCE_OPTIONS } from "@/tests/fixtures/master-data";

describe("budget request source dropdown options", () => {
  it("combines stable source choices with fiscal-year master data without duplicates", () => {
    expect(BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS).toEqual([
      "งบประมาณเงินรายได้",
      "งบประมาณแผ่นดิน",
    ]);
    expect(BUDGET_REQUEST_FUNDING_SOURCE_DETAIL_OPTIONS).toHaveLength(5);
    expect(BUDGET_REQUEST_PROJECT_TYPE_OPTIONS).toEqual([
      "1 โครงการขับเคลื่อนกลยุทธ์",
      "2 โครงการประจำตามภารกิจ",
    ]);
    expect(BUDGET_REQUEST_MISSION_OPTIONS).toHaveLength(4);
    expect(BUDGET_REQUEST_STRATEGY_OPTIONS).toHaveLength(5);
    expect(TEST_BUDGET_SOURCE_OPTIONS.outputCode).toContain("3101");
    expect(TEST_BUDGET_SOURCE_OPTIONS.activityCode).toContain("310132000001");
    expect(TEST_BUDGET_SOURCE_OPTIONS.expenditureBudget).toEqual(["งบดำเนินงาน", "งบลงทุน"]);
    for (const key of BUDGET_REQUEST_SOURCE_SELECT_KEYS) {
      const options = TEST_BUDGET_SOURCE_OPTIONS[key];
      expect(new Set(options).size).toBe(options.length);
    }
  });

  it("normalizes legacy labels before checking the fiscal-year options", () => {
    expect(normalizeBudgetRequestSourceOption("fundingSource", "เงินรายได้")).toBe(
      "งบประมาณเงินรายได้",
    );
    expect(
      isBudgetRequestSourceOption(TEST_BUDGET_SOURCE_OPTIONS, "fundingSource", "เงินรายได้"),
    ).toBe(true);
    expect(
      isBudgetRequestSourceOption(
        TEST_BUDGET_SOURCE_OPTIONS,
        "projectType",
        "โครงการที่ไม่อยู่ในรายการ",
      ),
    ).toBe(false);
    expect(isBudgetRequestSourceOption(TEST_BUDGET_SOURCE_OPTIONS, "outputCode", "3101")).toBe(
      true,
    );
    expect(
      isBudgetRequestSourceOption(TEST_BUDGET_SOURCE_OPTIONS, "activityCode", "999999999999"),
    ).toBe(false);
    expect(
      isBudgetRequestSourceOption(TEST_BUDGET_SOURCE_OPTIONS, "expenditureBudget", "งบดำเนินงาน"),
    ).toBe(true);
  });
});
