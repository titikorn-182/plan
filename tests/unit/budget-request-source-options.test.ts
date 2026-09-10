import { describe, expect, it } from "vitest";
import {
  BUDGET_REQUEST_FUNDING_SOURCE_DETAIL_OPTIONS,
  BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS,
  BUDGET_REQUEST_MISSION_OPTIONS,
  BUDGET_REQUEST_PROJECT_TYPE_OPTIONS,
  BUDGET_REQUEST_SOURCE_SELECT_OPTIONS,
  BUDGET_REQUEST_STRATEGY_OPTIONS,
  isBudgetRequestSourceOption,
  normalizeBudgetRequestSourceOption,
} from "@/features/budget-requests/source-options";
import {
  BUDGET_REQUEST_ACTIVITY_OPTIONS,
  BUDGET_REQUEST_OPERATIONAL_PLAN_OPTIONS,
  BUDGET_REQUEST_OUTPUT_OPTIONS,
} from "@/features/budget-requests/plan-structure-options";
import {
  BUDGET_REQUEST_EXPENDITURE_BUDGET_OPTIONS,
  BUDGET_REQUEST_EXPENSE_CATEGORY_OPTIONS,
  BUDGET_REQUEST_EXPENSE_OPTIONS,
  BUDGET_REQUEST_EXPENSE_SUBCATEGORY_OPTIONS,
} from "@/features/budget-requests/expense-source-options";

describe("budget request source dropdown options", () => {
  it("keeps the supplied options in source order without duplicates", () => {
    expect(BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS).toEqual([
      "งบประมาณเงินรายได้",
      "งบประมาณแผ่นดิน",
    ]);
    expect(BUDGET_REQUEST_FUNDING_SOURCE_DETAIL_OPTIONS).toHaveLength(5);
    expect(BUDGET_REQUEST_PROJECT_TYPE_OPTIONS).toEqual([
      "1 โครงการขับเคลื่อนกลยุทธ์",
      "2 โครงการประจำตามภารกิจ",
    ]);
    expect(BUDGET_REQUEST_MISSION_OPTIONS).toEqual([
      "พันธกิจที่ 1 ด้านการผลิตบัณฑิต",
      "พันธกิจที่ 2 ด้านการวิจัยและนวัตกรรม",
      "พันธกิจที่ 3 ด้านการบริการวิชาการ",
      "พันธกิจที่ 5 การบริหารจัดการองค์กร",
    ]);
    expect(BUDGET_REQUEST_STRATEGY_OPTIONS).toHaveLength(5);
    expect(BUDGET_REQUEST_OUTPUT_OPTIONS).toHaveLength(5);
    expect(BUDGET_REQUEST_OPERATIONAL_PLAN_OPTIONS).toHaveLength(10);
    expect(BUDGET_REQUEST_ACTIVITY_OPTIONS).toHaveLength(30);
    expect(BUDGET_REQUEST_EXPENSE_OPTIONS).toHaveLength(18);
    expect(BUDGET_REQUEST_EXPENDITURE_BUDGET_OPTIONS).toHaveLength(4);
    expect(BUDGET_REQUEST_EXPENSE_CATEGORY_OPTIONS).toHaveLength(9);
    expect(BUDGET_REQUEST_EXPENSE_SUBCATEGORY_OPTIONS).toHaveLength(17);
    expect(BUDGET_REQUEST_OUTPUT_OPTIONS[0]).toEqual({
      code: "3101",
      name: "ผลงานการให้บริการวิชาการ",
    });
    expect(BUDGET_REQUEST_ACTIVITY_OPTIONS.at(-1)).toEqual({
      code: "510252000183",
      name: "โครงการปรับปรุงภูมิทัศน์ด้านหน้าอาคารและโถงลิฟท์ชั้น 1",
    });
    for (const options of Object.values(BUDGET_REQUEST_SOURCE_SELECT_OPTIONS)) {
      expect(new Set(options).size).toBe(options.length);
    }
  });

  it("normalizes the legacy workbook funding source to the new dropdown label", () => {
    expect(normalizeBudgetRequestSourceOption("fundingSource", "เงินรายได้")).toBe(
      "งบประมาณเงินรายได้",
    );
    expect(isBudgetRequestSourceOption("fundingSource", "เงินรายได้")).toBe(true);
    expect(isBudgetRequestSourceOption("projectType", "โครงการที่ไม่อยู่ในรายการ")).toBe(false);
    expect(isBudgetRequestSourceOption("outputCode", "3101")).toBe(true);
    expect(isBudgetRequestSourceOption("activityCode", "999999999999")).toBe(false);
    expect(isBudgetRequestSourceOption("expenditureBudget", "งบดำเนินงาน")).toBe(true);
    expect(isBudgetRequestSourceOption("expenseCategory", "หมวดนอกระบบ")).toBe(false);
  });
});
