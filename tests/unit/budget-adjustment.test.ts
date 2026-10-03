import { describe, expect, it, vi } from "vitest";
import { PDFDocument, PDFPage } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  adjustmentSchema,
  adjustmentTotals,
  initialAdjustment,
  SIGNER_ROLES,
} from "@/features/budget-adjustments/schema";
import { createBudgetAdjustmentPdf } from "@/features/budget-adjustments/pdf";

function fixture() {
  const data = initialAdjustment("2026-10-03");
  data.project = "โครงการพัฒนาทักษะนักศึกษา (ข้อมูลสมมติสำหรับทดสอบ)";
  data.head = "หัวหน้าโครงการทดสอบ";
  data.schedule = "1–30 พฤศจิกายน 2569";
  data.reason =
    "ปรับรายการค่าใช้จ่ายให้เหมาะสมกับจำนวนผู้เข้าร่วม โดยคงกรอบวงเงินรวมที่ได้รับอนุมัติ";
  data.rows = [
    {
      before: {
        code: "200115210001",
        project: data.project,
        expense: "ค่าตอบแทนวิทยากร",
        amount: "15000",
      },
      after: {
        code: "200115210001",
        project: data.project,
        expense: "ค่าตอบแทนวิทยากร",
        amount: "12000",
      },
    },
    {
      before: {
        code: "200115210001",
        project: data.project,
        expense: "ค่าวัสดุประกอบการอบรม",
        amount: "5000",
      },
      after: {
        code: "200115210001",
        project: data.project,
        expense: "ค่าวัสดุประกอบการอบรม",
        amount: "8000",
      },
    },
  ];
  return data;
}
describe("offline budget adjustment", () => {
  it("accepts the complete memorandum and six blank or editable signatories", () => {
    expect(adjustmentSchema.safeParse(fixture()).success).toBe(true);
    expect(SIGNER_ROLES).toHaveLength(6);
  });
  it("requires memorandum data and valid calendar dates", () => {
    expect(adjustmentSchema.safeParse(initialAdjustment()).success).toBe(false);
    expect(adjustmentSchema.safeParse({ ...fixture(), date: "2026-02-30" }).success).toBe(false);
  });
  it.each(["", "-1", "Infinity", "NaN", "1e5", "1,000", "1.234", "10000000000"])(
    "rejects invalid amount %s",
    (amount) => {
      const data = fixture();
      data.rows[0].before.amount = amount;
      expect(adjustmentSchema.safeParse(data).success).toBe(false);
    },
  );
  it("uses integer satang for totals and permits adding/removing a budget via zero", () => {
    const data = fixture();
    data.rows[0].before.amount = "0.10";
    data.rows[1].before.amount = "0.20";
    data.rows[0].after.amount = "0";
    data.rows[1].after.amount = "0.35";
    expect(adjustmentSchema.safeParse(data).success).toBe(true);
    expect(adjustmentTotals(data.rows)).toEqual({ before: 0.3, after: 0.35, difference: 0.05 });
  });
  it("bounds row count and rejects control characters", () => {
    const data = fixture();
    expect(
      adjustmentSchema.safeParse({ ...data, rows: Array(31).fill(data.rows[0]) }).success,
    ).toBe(false);
    expect(adjustmentSchema.safeParse({ ...data, reason: "bad\u0000text" }).success).toBe(false);
  });
  it.each([false, true])(
    "renders all content and signatories within printable bounds; long=%s",
    async (long) => {
      const data = fixture();
      if (long) {
        data.reason = "เหตุผลในการปรับงบประมาณโครงการ ".repeat(100);
        data.rows = Array.from({ length: 15 }, (_, i) => ({
          ...data.rows[0],
          before: {
            ...data.rows[0].before,
            expense: `รายการ ${i + 1} ` + "ค่าใช้จ่ายในการดำเนินกิจกรรม ".repeat(15),
          },
        }));
        data.signers[0].position = "ตำแหน่งผู้รับผิดชอบโครงการ ".repeat(8);
      }
      const spy = vi.spyOn(PDFPage.prototype, "drawText");
      const images = vi.spyOn(PDFPage.prototype, "drawImage");
      const pdf = await createBudgetAdjustmentPdf(data);
      const document = await PDFDocument.load(pdf);
      expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
      expect(images).toHaveBeenCalledOnce();
      expect(images.mock.calls[0][1]).toMatchObject({ x: 68, height: 54 });
      const beforeHeading = spy.mock.calls.find(([text]) => text === "เดิม")![1]!;
      const afterHeading = spy.mock.calls.find(([text]) => text === "ปรับเป็น")![1]!;
      expect(beforeHeading.y).toBe(afterHeading.y);
      expect(afterHeading.x).toBeGreaterThan(beforeHeading.x!);
      const content = spy.mock.calls.map(([text]) => text).join("");
      for (const role of SIGNER_ROLES) expect(content).toContain(role);
      expect(content).toContain("เดิม");
      expect(content).toContain("ปรับเป็น");
      expect(document.getSubject()).toContain("สำหรับเสนออนุมัตินอกระบบ");
      for (const [text, options] of spy.mock.calls) {
        expect(options!.x).toBeGreaterThanOrEqual(28.9);
        expect(options!.y).toBeGreaterThanOrEqual(22);
        expect(
          options!.x! + options!.font!.widthOfTextAtSize(text, options!.size!),
        ).toBeLessThanOrEqual(566.5);
      }
      expect(Buffer.from(pdf).toString("latin1")).not.toMatch(/\/Type\s*\/ObjStm/);
      if (!long) {
        const compact = fixture();
        compact.project = "พัฒนาทักษะนักศึกษา (ทดสอบ)";
        compact.rows = compact.rows.map((row) => ({
          before: { ...row.before, project: compact.project },
          after: { ...row.after, project: compact.project },
        }));
        const compactPdf = await createBudgetAdjustmentPdf(compact);
        expect((await PDFDocument.load(compactPdf)).getPageCount()).toBe(1);
        if (process.env.BUDGET_ADJUSTMENT_PDF_SAMPLE) {
          await mkdir(dirname(process.env.BUDGET_ADJUSTMENT_PDF_SAMPLE), { recursive: true });
          await writeFile(process.env.BUDGET_ADJUSTMENT_PDF_SAMPLE, compactPdf);
        }
      }
    },
  );
});
