import { describe, expect, it, vi } from "vitest";
import { BUDGET_REQUEST_IMPORT_HEADERS } from "@/features/budget-requests/source-fields";

vi.mock("client-only", () => ({}));

describe("budget request file import", () => {
  it("maps a CSV row by all 36 supplied headers", async () => {
    const { parseBudgetRequestImportFile } = await import("@/features/budget-requests/import-file");
    const cells = BUDGET_REQUEST_IMPORT_HEADERS.map(() => "");
    cells[0] = "2301";
    cells[14] = '"โครงการทดสอบ, ประจำปี"';
    cells[20] = "929300";
    cells[21] = "ผู้รับผิดชอบโครงการ";
    cells[26] = "หลักการและเหตุผลที่ครบถ้วน";
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
      projectActivityName: "โครงการทดสอบ, ประจำปี",
      totalBudget: "929300",
      ownerName: "ผู้รับผิดชอบโครงการ",
      rationale: "หลักการและเหตุผลที่ครบถ้วน",
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
    row[14] = "โครงการจาก Excel";
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
      projectActivityName: "โครงการจาก Excel",
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
});
