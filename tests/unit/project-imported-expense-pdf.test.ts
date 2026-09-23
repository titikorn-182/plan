import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { PDFDocument, PDFPage } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { createProjectProposalPdf } from "@/features/projects/project-proposal-pdf";
import { createEmptyProjectProposalDetails } from "@/features/projects/proposal-details";

describe("imported project expense PDF pagination", () => {
  it("keeps every line of an oversized expense cell on the printed pages", async () => {
    const drawText = vi.spyOn(PDFPage.prototype, "drawText");
    const details = createEmptyProjectProposalDetails();
    const lines = Array.from(
      { length: 180 },
      (_, index) => `Expense line ${String(index + 1).padStart(3, "0")}`,
    );
    details.expenseItems = [
      {
        category: "ครุภัณฑ์",
        description: lines.join("\n"),
        rate: 2500,
        units: 1,
        quantity: 1,
        occurrences: 1,
        amount: 2500,
      },
      {
        category: "ค่าใช้สอย",
        description: "Following expense row",
        rate: 100,
        units: 1,
        quantity: 1,
        occurrences: 1,
        amount: 100,
      },
    ];
    const bytes = await createProjectProposalPdf({
      code: "PR-IMPORTED-LONG",
      title: "ทดสอบรายละเอียดค่าใช้จ่ายจากคำของบที่ยาวหลายหน้า",
      organizationName: "หน่วยงานทดสอบ",
      fiscalYearLabel: "ปีงบประมาณ 2570",
      budgetRequestLabel: "BR-TEST · คำของบที่อนุมัติแล้ว",
      projectType: "ทดสอบ",
      ownerName: "หัวหน้าโครงการทดสอบ",
      coordinatorName: "ผู้ประสานงานทดสอบ",
      approvedBudget: 2600,
      disbursementTarget: 100,
      startsOn: "2026-10-01",
      endsOn: "2027-09-30",
      status: "proposed",
      proposalDetails: details,
    });

    const expenseCalls = drawText.mock.calls
      .map(([text, options], index) => ({ text, options, page: drawText.mock.instances[index] }))
      .filter(({ text }) => text.startsWith("Expense line "));
    expect(expenseCalls.map(({ text }) => text)).toEqual(lines);
    expect(new Set(expenseCalls.map(({ page }) => page)).size).toBeGreaterThanOrEqual(3);
    for (const { options } of expenseCalls) {
      expect(options?.y).toBeGreaterThanOrEqual(54);
      expect(options?.y).toBeLessThan(800);
    }
    const following = drawText.mock.calls.find(([text]) => text === "Following expense row");
    expect(following?.[1]?.y).toBeGreaterThanOrEqual(54);
    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(6);

    const fixturePath = process.env.PROJECT_IMPORTED_PDF_FIXTURE_PATH;
    if (fixturePath) {
      await mkdir(dirname(fixturePath), { recursive: true });
      await writeFile(fixturePath, bytes);
    }
  });
});
