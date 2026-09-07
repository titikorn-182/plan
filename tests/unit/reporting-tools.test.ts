import { describe, expect, it } from "vitest";
import { parseDisbursementImportFile } from "@/features/disbursements/import-file";
import { parseProjectFilters, projectFilterQuery } from "@/features/projects/filters";
import { parseReportingPeriodPreference } from "@/features/shared/period-preference";
import { createWorkbookBuffer } from "@/lib/server/workbooks";

describe("reporting period preference", () => {
  it("accepts only a UUID and quarter 1-4", () => {
    expect(parseReportingPeriodPreference("30000000-0000-4000-8000-000000000001:3")).toEqual({
      fiscalYearId: "30000000-0000-4000-8000-000000000001",
      quarter: 3,
    });
    expect(parseReportingPeriodPreference("not-a-year:3")).toBeNull();
    expect(parseReportingPeriodPreference("30000000-0000-4000-8000-000000000001:5")).toBeNull();
  });
});

describe("project filters", () => {
  it("normalizes empty numeric inputs and rejects invalid enum values", () => {
    const filters = parseProjectFilters({
      search: "  โครงการทดสอบ  ",
      health: "unknown",
      minBudget: "",
      maxProgress: "80",
    });
    expect(filters).toMatchObject({
      search: "โครงการทดสอบ",
      health: "",
      minBudget: null,
      maxProgress: 80,
    });
    expect(projectFilterQuery(filters)).not.toHaveProperty("minBudget", "0");
  });
});

describe("disbursement import parsing", () => {
  it("parses and validates a CSV row", async () => {
    const csv = [
      "project_code,quarter,amount,disbursed_on,reference_no,status",
      "TEST-P1,2,1250.50,2027-02-10,REF-001,recorded",
    ].join("\n");
    const parsed = await parseDisbursementImportFile(
      new File([csv], "disbursements.csv", { type: "text/csv" }),
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({
      projectCode: "TEST-P1",
      quarter: 2,
      amount: 1250.5,
      disbursedOn: "2027-02-10",
      status: "recorded",
    });
  });

  it("reads the downloadable workbook layout with title rows", async () => {
    const buffer = await createWorkbookBuffer({
      title: "แม่แบบนำเข้า",
      sheetName: "disbursements",
      columns: [
        { header: "project_code" },
        { header: "quarter" },
        { header: "amount" },
        { header: "disbursed_on" },
        { header: "reference_no" },
        { header: "status" },
      ],
      rows: [["TEST-P1", 1, 500, "2027-01-15", "REF-002", "pending_docs"]],
    });
    const body = new Uint8Array(buffer.byteLength);
    body.set(buffer);
    const parsed = await parseDisbursementImportFile(new File([body.buffer], "disbursements.xlsx"));
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]).toMatchObject({ rowNumber: 4, projectCode: "TEST-P1", amount: 500 });
  });
});
