import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { PDFPage } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { createProjectProposalPdf } from "@/features/projects/project-proposal-pdf";
import { createEmptyProjectProposalDetails } from "@/features/projects/proposal-details";
import { formatMoney } from "@/features/projects/project-proposal-pdf-builder";
import { formatThaiBahtText } from "@/features/shared/thai-baht-text";

const NOTE =
  "หมายเหตุ รายการค่าใช้จ่ายขออนุมัติถัวจ่ายทุกรายการภายใต้กรอบวงเงินรวมทั้งหมดที่ได้รับอนุมัติของโครงการ";

describe("project expense total and allocation note in PDF", () => {
  it.each([232200, 0, 232200.25, 999999999999.99])(
    "prints the actual expense total %s, its Thai wording and the note without overlap",
    async (amount) => {
      const drawText = vi.spyOn(PDFPage.prototype, "drawText");
      const details = createEmptyProjectProposalDetails();
      const amounts = amount === 232200 ? [32400, 27000, 10800, 36000, 90000, 36000] : [amount];
      details.expenseItems = amounts.map((value, index) => ({
        category: "ค่าใช้สอย",
        description: `รายการค่าใช้จ่ายทดสอบที่ ${index + 1}`,
        rate: value,
        units: 1,
        quantity: 1,
        occurrences: 1,
        amount: value,
      }));
      const bytes = await createProjectProposalPdf({
        code: "PR-PDF-EXPENSE-TEST",
        title: "ตัวอย่างทดสอบสรุปค่าใช้จ่าย (ข้อมูลสมมติ)",
        organizationName: "หน่วยงานทดสอบ",
        fiscalYearLabel: "ปีงบประมาณ 2570",
        budgetRequestLabel: "BR-TEST",
        projectType: "ทดสอบ",
        ownerName: "หัวหน้าโครงการทดสอบ",
        coordinatorName: "ผู้ประสานงานทดสอบ",
        // Different approved amount guards against reading the wrong source.
        approvedBudget: amount + 100,
        disbursementTarget: 100,
        startsOn: "2026-10-01",
        endsOn: "2027-09-30",
        status: "proposed",
        proposalDetails: details,
      });
      const calls = drawText.mock.calls.map(([text, options], index) => ({
        text,
        options: options!,
        page: drawText.mock.instances[index] as PDFPage,
      }));
      const start = calls.findIndex(({ text }) => text.startsWith("จำนวนเงินรวมทั้งสิ้น"));
      const end = calls.findIndex(({ text }) => text.startsWith("9. หัวหน้าโครงการ"));
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      const summary = calls
        .slice(start, end)
        .filter(({ text }) => !text.startsWith("ข้อเสนอโครงการ"));
      const numericIndex = summary.findIndex(({ text }) => text === `${formatMoney(amount)} บาท`);
      expect(numericIndex).toBeGreaterThan(0);
      expect(
        summary
          .slice(0, numericIndex)
          .map(({ text }) => text)
          .join(""),
      ).toBe(`จำนวนเงินรวมทั้งสิ้น (${formatThaiBahtText(amount)})`);
      expect(
        summary
          .slice(numericIndex + 1)
          .map(({ text }) => text)
          .join(""),
      ).toBe(NOTE);
      expect(calls.some(({ text }) => text === "รวมรายละเอียดค่าใช้จ่าย")).toBe(false);
      expect(new Set(summary.map(({ page }) => page)).size).toBe(1);
      const numericX = summary[numericIndex].options.x!;
      for (const { options, text, page } of summary) {
        expect(options.y).toBeGreaterThanOrEqual(54);
        expect(options.x).toBeGreaterThanOrEqual(42);
        expect(
          options.x! + options.font!.widthOfTextAtSize(text, options.size!),
        ).toBeLessThanOrEqual(page.getWidth() - 42 + 0.01);
      }
      for (const { options, text } of summary.slice(0, numericIndex)) {
        expect(
          options.x! + options.font!.widthOfTextAtSize(text, options.size!),
        ).toBeLessThanOrEqual(numericX - 16 + 0.01);
      }
      expect(summary[numericIndex + 1].options.y).toBeLessThan(
        summary[numericIndex - 1].options.y! - 10,
      );
      const fixturePath = process.env.PROJECT_EXPENSE_SUMMARY_PDF_FIXTURE_PATH;
      if (fixturePath && amount === 232200) {
        await mkdir(dirname(fixturePath), { recursive: true });
        await writeFile(fixturePath, bytes);
      }
    },
  );
});
