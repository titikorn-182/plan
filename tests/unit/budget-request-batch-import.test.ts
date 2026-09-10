import { describe, expect, it } from "vitest";
import { groupBudgetRequestImportedRecords } from "@/features/budget-requests/batch-import";
import type { BudgetRequestImportedRecord } from "@/features/budget-requests/import-types";
import { createEmptyBudgetRequestSourceValues } from "@/features/budget-requests/source-fields";

function record(
  rowNumber: number,
  values: Partial<ReturnType<typeof createEmptyBudgetRequestSourceValues>>,
): BudgetRequestImportedRecord {
  return {
    errors: [],
    rowNumber,
    values: { ...createEmptyBudgetRequestSourceValues(), ...values },
    warnings: [],
  };
}

describe("budget request batch import", () => {
  it("groups rows by the 12-digit activity code and preserves every expense line", () => {
    const groups = groupBudgetRequestImportedRecords([
      record(2, {
        activityCode: "310132000001",
        projectActivityName: "โครงการสนับสนุนบริการวิชาการ",
        organizationCode: "2301",
        organizationName: "สำนักงานเลขานุการ",
        projectType: "2 โครงการประจำตามภารกิจ",
        ownerName: "หัวหน้าโครงการ คนที่หนึ่ง",
        ownerPosition: "ประธานโครงการ",
        rationale: "เหตุผลส่วนที่หนึ่ง",
        startsOn: "2026-10-15",
        endsOn: "2027-05-31",
        subActivityName: "กิจกรรมเตรียมงาน",
        expenditureBudget: "งบดำเนินงาน",
        expenseCategory: "ค่าใช้สอย",
        expenseSubcategory: "ค่าจ้างเหมาบริการ",
        expenseDescription: "ค่าจ้างจัดเตรียมเอกสาร",
        totalBudget: "1250.50",
      }),
      record(3, {
        activityCode: "310132000001",
        projectActivityName: "โครงการสนับสนุนบริการวิชาการ",
        organizationCode: "2301",
        organizationName: "สำนักงานเลขานุการ",
        projectType: "2 โครงการประจำตามภารกิจ",
        ownerName: "ผู้รับผิดชอบ คนที่สอง",
        ownerPosition: "กรรมการ",
        rationale: "เหตุผลส่วนที่สอง",
        startsOn: "2026-10-01",
        endsOn: "2027-09-30",
        subActivityName: "กิจกรรมดำเนินงาน",
        expenditureBudget: "งบดำเนินงาน",
        expenseCategory: "ค่าวัสดุ",
        expenseSubcategory: "วัสดุสำนักงาน",
        expenseDescription: "ค่าวัสดุ",
        totalBudget: "2500",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      id: "310132000001",
      rowNumbers: [2, 3],
      totalAmount: 3750.5,
      values: {
        ownerName: "หัวหน้าโครงการ คนที่หนึ่ง",
        startsOn: "2026-10-01",
        endsOn: "2027-09-30",
      },
      projectMembers: [{ name: "ผู้รับผิดชอบ คนที่สอง", position: "กรรมการ" }],
    });
    expect(groups[0].expenseItems).toEqual([
      expect.objectContaining({
        subActivityName: "กิจกรรมเตรียมงาน",
        amount: 1250.5,
      }),
      expect.objectContaining({
        subActivityName: "กิจกรรมดำเนินงาน",
        amount: 2500,
      }),
    ]);
    expect(groups[0].values.rationale).toBe("เหตุผลส่วนที่หนึ่ง\n\nเหตุผลส่วนที่สอง");
    expect(groups[0].errors).toEqual([]);
  });

  it("blocks a row that has no activity code instead of merging it with another blank row", () => {
    const groups = groupBudgetRequestImportedRecords([
      record(2, { projectActivityName: "โครงการหนึ่ง" }),
      record(3, { projectActivityName: "โครงการสอง" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every((group) => group.errors.some((error) => error.includes("12 หลัก")))).toBe(
      true,
    );
  });
});
