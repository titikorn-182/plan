import { describe, expect, it, vi } from "vitest";
import { BUDGET_REQUEST_IMPORT_HEADERS } from "@/features/budget-requests/source-fields";

vi.mock("client-only", () => ({}));

describe("budget request file import", () => {
  it("maps a CSV row by all 36 supplied headers", async () => {
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");
    const cells = BUDGET_REQUEST_IMPORT_HEADERS.map(() => "");
    cells[0] = "2301";
    cells[2] = "เงินรายได้";
    cells[3] = "เงินรายได้จากค่าธรรมเนียมการศึกษา";
    cells[4] = "2 โครงการประจำตามภารกิจ";
    cells[5] = "พันธกิจที่ 1 ด้านการผลิตบัณฑิต";
    cells[9] = "3101";
    cells[10] = "ผลงานการให้บริการวิชาการ";
    cells[11] = "31013200";
    cells[12] = "แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ";
    cells[13] = "310132000001";
    cells[14] = "โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ";
    cells[16] = "งบดำเนินงาน";
    cells[17] = "ค่าใช้สอย";
    cells[18] = "ค่าใช้สอยอื่น ๆ";
    cells[20] = "929300";
    cells[21] = "ผู้รับผิดชอบโครงการ";
    cells[26] = '"หลักการและเหตุผล, ที่ครบถ้วน"';
    const file = new File(
      [`${BUDGET_REQUEST_IMPORT_HEADERS.join(",")}\n${cells.join(",")}`],
      "budget.csv",
      { type: "text/csv" },
    );

    const result = await parseBudgetRequestImportFile(file);

    expect(result.errors).toEqual([]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0].values).toMatchObject({
      organizationCode: "2301",
      fundingSource: "งบประมาณเงินรายได้",
      fundingSourceDetail: "เงินรายได้จากค่าธรรมเนียมการศึกษา",
      projectType: "2 โครงการประจำตามภารกิจ",
      missionName: "พันธกิจที่ 1 ด้านการผลิตบัณฑิต",
      outputCode: "3101",
      outputName: "ผลงานการให้บริการวิชาการ",
      operationalPlanCode: "31013200",
      operationalPlanName: "แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
      activityCode: "310132000001",
      projectActivityName: "โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
      expenditureBudget: "งบดำเนินงาน",
      expenseCategory: "ค่าใช้สอย",
      expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
      totalBudget: "929300",
      ownerName: "ผู้รับผิดชอบโครงการ",
      rationale: "หลักการและเหตุผล, ที่ครบถ้วน",
    });
  });

  it("reports every missing source column before importing", async () => {
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");
    const file = new File(["รหัสหน่วยงานย่อย\n2301"], "incomplete.csv", {
      type: "text/csv",
    });

    const result = await parseBudgetRequestImportFile(file);

    expect(result.records).toEqual([]);
    expect(result.errors[0]).toContain("35 คอลัมน์");
  });

  it("reads the supplied header structure from an XLSX worksheet", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Raw Data");
    worksheet.addRow(BUDGET_REQUEST_IMPORT_HEADERS);
    const row: (string | number | Date)[] = BUDGET_REQUEST_IMPORT_HEADERS.map(() => "");
    row[0] = "2303";
    row[9] = "3101";
    row[10] = "ผลงานการให้บริการวิชาการ";
    row[11] = "31013200";
    row[12] = "แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ";
    row[13] = "310132000001";
    row[14] = "โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ";
    row[16] = "งบลงทุน";
    row[17] = "ครุภัณฑ์";
    row[18] = "ครุภัณฑ์สำนักงาน";
    row[20] = 250000;
    row[27] = new Date("2026-10-01T00:00:00Z");
    worksheet.addRow(row);
    const buffer = await workbook.xlsx.writeBuffer();
    const file = new File([new Uint8Array(buffer)], "budget.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");

    const result = await parseBudgetRequestImportFile(file);

    expect(result.errors).toEqual([]);
    expect(result.records[0].values).toMatchObject({
      organizationCode: "2303",
      outputCode: "3101",
      operationalPlanCode: "31013200",
      activityCode: "310132000001",
      projectActivityName: "โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
      expenditureBudget: "งบลงทุน",
      expenseCategory: "ครุภัณฑ์",
      expenseSubcategory: "ครุภัณฑ์สำนักงาน",
      totalBudget: "250000",
      startsOn: "2026-10-01",
    });
  });

  it("flags invalid dates and amounts before a row can be applied", async () => {
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");
    const cells = BUDGET_REQUEST_IMPORT_HEADERS.map(() => "");
    cells[20] = "not-an-amount";
    cells[27] = "31/09/2026";
    const file = new File(
      [`${BUDGET_REQUEST_IMPORT_HEADERS.join(",")}\n${cells.join(",")}`],
      "invalid.csv",
      { type: "text/csv" },
    );

    const result = await parseBudgetRequestImportFile(file);

    expect(result.errors).toEqual([]);
    expect(result.records[0].errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("งบประมาณรวมทั้งหมดไม่ถูกต้อง"),
        expect.stringContaining("วันที่เริ่มต้องเป็นวันที่ที่ถูกต้อง"),
      ]),
    );
  });

  it("flags imported dropdown values that are outside the approved source lists", async () => {
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");
    const cells = BUDGET_REQUEST_IMPORT_HEADERS.map(() => "");
    cells[4] = "ประเภทโครงการนอกระบบ";
    const file = new File(
      [`${BUDGET_REQUEST_IMPORT_HEADERS.join(",")}\n${cells.join(",")}`],
      "invalid-option.csv",
      { type: "text/csv" },
    );

    const result = await parseBudgetRequestImportFile(file);

    expect(result.records[0].errors).toContain("แถว 2: ประเภทโครงการไม่อยู่ในรายการที่กำหนด");
  });

  it("flags an expense value that is outside the approved workbook list", async () => {
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");
    const cells = BUDGET_REQUEST_IMPORT_HEADERS.map(() => "");
    cells[16] = "งบรายจ่ายนอกระบบ";
    const file = new File(
      [`${BUDGET_REQUEST_IMPORT_HEADERS.join(",")}\n${cells.join(",")}`],
      "invalid-expense.csv",
      { type: "text/csv" },
    );

    const result = await parseBudgetRequestImportFile(file);

    expect(result.records[0].errors).toContain("แถว 2: งบรายจ่ายไม่อยู่ในรายการที่กำหนด");
  });

  it("flags expense choices that exist but do not belong to the same hierarchy", async () => {
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");
    const cells = BUDGET_REQUEST_IMPORT_HEADERS.map(() => "");
    cells[16] = "งบลงทุน";
    cells[17] = "ค่าใช้สอย";
    cells[18] = "ค่าจ้างเหมาบริการ";
    const file = new File(
      [`${BUDGET_REQUEST_IMPORT_HEADERS.join(",")}\n${cells.join(",")}`],
      "invalid-expense-hierarchy.csv",
      { type: "text/csv" },
    );

    const result = await parseBudgetRequestImportFile(file);

    expect(result.records[0].errors).toContain(
      "แถว 2: งบรายจ่าย หมวดรายจ่าย และหมวดรายจ่ายย่อยไม่สัมพันธ์กัน",
    );
  });
});
