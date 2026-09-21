import { describe, expect, it } from "vitest";
import { createEmptyBudgetRequestSourceValues } from "@/features/budget-requests/source-fields";
import {
  applyBudgetPlanSelection,
  getBudgetPlanSourceOptions,
} from "@/features/budget-requests/plan-selection";
import { TEST_BUDGET_SOURCE_OPTIONS, TEST_MASTER_DATA } from "@/tests/fixtures/master-data";

describe("budget workbook plan selection", () => {
  it("selects a complete matching hierarchy by activity name without losing other inputs", () => {
    const values = { ...createEmptyBudgetRequestSourceValues(), ownerName: "ผู้รับผิดชอบ ทดสอบ" };
    const selected = applyBudgetPlanSelection(
      values,
      "projectActivityName",
      "โครงการผลิตบัณฑิตระดับปริญญาตรี คณะรัฐศาสตร์",
      TEST_MASTER_DATA,
    );
    expect(selected).toMatchObject({
      ownerName: values.ownerName,
      outputCode: "1002",
      outputName: "ผู้สำเร็จการศึกษาด้านสังคมศาสตร์",
      operationalPlanCode: "10021023",
      activityCode: "100210230001",
    });
  });

  it("filters child choices and clears incompatible children when the output changes", () => {
    const selected = applyBudgetPlanSelection(
      createEmptyBudgetRequestSourceValues(),
      "activityCode",
      "100210230001",
      TEST_MASTER_DATA,
    )!;
    const changed = applyBudgetPlanSelection(selected, "outputCode", "3101", TEST_MASTER_DATA)!;
    expect(changed).toMatchObject({
      outputCode: "3101",
      outputName: "ผลงานการให้บริการวิชาการ",
      operationalPlanCode: "",
      operationalPlanName: "",
      activityCode: "",
      projectActivityName: "",
    });
    const options = getBudgetPlanSourceOptions(
      TEST_BUDGET_SOURCE_OPTIONS,
      changed,
      TEST_MASTER_DATA,
    );
    expect(options.operationalPlanCode).toEqual(["31013200"]);
    expect(options.activityCode).toEqual(["310132000001"]);
    expect(options.fundingSource).toEqual(TEST_BUDGET_SOURCE_OPTIONS.fundingSource);
  });

  it("does not reinterpret unrelated input as a plan selection", () => {
    expect(
      applyBudgetPlanSelection(
        createEmptyBudgetRequestSourceValues(),
        "rationale",
        "เหตุผล",
        TEST_MASTER_DATA,
      ),
    ).toBeNull();
  });
});
