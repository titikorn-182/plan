import { describe, expect, it } from "vitest";
import {
  BUDGET_REQUEST_IMPORT_COLUMNS,
  BUDGET_REQUEST_SOURCE_SECTIONS,
  createEmptyBudgetRequestSourceValues,
  getBudgetRequestSourceCompletion,
  isBudgetRequestOrganizationCompatible,
  toBudgetProposalDetails,
} from "@/features/budget-requests/source-fields";

describe("budget request source fields", () => {
  it("uses every column from the supplied Executive DataProject header row", () => {
    expect(BUDGET_REQUEST_IMPORT_COLUMNS).toHaveLength(36);
    expect(BUDGET_REQUEST_IMPORT_COLUMNS[0]).toEqual({
      key: "organizationCode",
      header: "รหัสหน่วยงานย่อย",
    });
    expect(BUDGET_REQUEST_IMPORT_COLUMNS[35]).toEqual({
      key: "approverPosition",
      header: "ตำแหน่งผู้อนุมัติโครงการ",
    });
    expect(BUDGET_REQUEST_SOURCE_SECTIONS.flatMap((section) => section.fields)).toHaveLength(36);
    const importKeys = BUDGET_REQUEST_IMPORT_COLUMNS.map((column) => column.key);
    const renderedKeys = BUDGET_REQUEST_SOURCE_SECTIONS.flatMap((section) =>
      section.fields.map((field) => field.key),
    );
    expect(new Set(importKeys).size).toBe(36);
    expect(renderedKeys).toEqual(expect.arrayContaining(importKeys));
    expect(new Set(renderedKeys).size).toBe(36);
    expect(
      BUDGET_REQUEST_SOURCE_SECTIONS.flatMap((section) => section.fields).find(
        (field) => field.key === "organizationName",
      )?.control,
    ).toBe("organization-name");
  });

  it("maps source-only fields to the proposal detail payload without losing legacy keys", () => {
    const values = createEmptyBudgetRequestSourceValues();
    values.organizationName = "สำนักงานเลขานุการ-งานแผนและงบประมาณ";
    values.fundCode = "4";
    values.msdsId = "7718";
    values.spendingPlanTotal = "929300";

    const details = toBudgetProposalDetails(values);
    expect(details).toMatchObject({
      organizationName: "สำนักงานเลขานุการ-งานแผนและงบประมาณ",
      fundCode: "4",
      msdsId: "7718",
      spendingPlanTotal: "929300",
      sdgs: [],
      alignmentDescription: "",
    });
    expect(getBudgetRequestSourceCompletion(values)).toBe(4);
  });

  it("matches source organization codes to the permitted system organization family", () => {
    expect(
      isBudgetRequestOrganizationCompatible("2301", "สำนักงานเลขานุการ-งานแผนและงบประมาณ"),
    ).toBe(true);
    expect(isBudgetRequestOrganizationCompatible("2302", "ภาควิชารัฐประศาสนศาสตร์")).toBe(false);
  });
});
