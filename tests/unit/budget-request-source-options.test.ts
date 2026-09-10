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

describe("budget request source dropdown options", () => {
  it("keeps the supplied options in source order without duplicates", () => {
    expect(BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS).toEqual([
      "งบประมาณเงินรายได้",
      "งบประมาณแผ่นดิน",
    ]);
    expect(BUDGET_REQUEST_FUNDING_SOURCE_DETAIL_OPTIONS).toHaveLength(5);
    expect(BUDGET_REQUEST_PROJECT_TYPE_OPTIONS).toEqual([
      "2 โครงการประจำตามภารกิจ",
      "1 โครงการขับเคลื่อนกลยุทธ์",
    ]);
    expect(BUDGET_REQUEST_MISSION_OPTIONS).toHaveLength(4);
    expect(BUDGET_REQUEST_STRATEGY_OPTIONS).toHaveLength(5);
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
  });
});
