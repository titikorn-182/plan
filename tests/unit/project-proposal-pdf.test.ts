import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument, PDFPage } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectProposalPdf } from "@/features/projects/project-proposal-pdf";
import { createEmptyProjectProposalDetails } from "@/features/projects/proposal-details";

describe("project proposal PDF", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a readable multi-section PDF with Thai proposal data", async () => {
    const drawText = vi.spyOn(PDFPage.prototype, "drawText");
    const details = createEmptyProjectProposalDetails();
    details.characteristics = ["การจัดอบรมเชิงปฏิบัติการ/จัดประชุม/อบรม/สัมมนา"];
    details.strategies = ["กลยุทธ์ที่ 4 : บริการวิชาการเพื่อสร้างความยั่งยืน"];
    details.rationale = "เพื่อพัฒนาความรู้และทักษะของกลุ่มเป้าหมายอย่างเป็นระบบ";
    details.objectives = "สร้างผลลัพธ์ที่วัดได้และนำไปใช้ประโยชน์ได้จริง";
    details.targetGroup = "บุคลากรและนักศึกษา จำนวน 50 คน";
    details.sdgs = ["SDG 4 การศึกษาที่มีคุณภาพ", "SDG 17 หุ้นส่วนเพื่อการพัฒนา"];
    details.sdgAlignmentDescription = "สนับสนุนการเรียนรู้และความร่วมมือระหว่างหน่วยงาน";
    details.startWeek = 1;
    details.endWeek = 4;
    details.actionPlan = [
      { description: "เตรียมการและประสานงาน", months: [0, 1] },
      { description: "ดำเนินกิจกรรมและสรุปผล", months: [2, 3] },
    ];
    details.location = "คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี";
    details.expectedResults = "ผู้เข้าร่วมสามารถนำความรู้ไปประยุกต์ใช้ได้";
    details.processIndicator = "ดำเนินกิจกรรมครบตามแผน";
    details.outputIndicator = "ผู้เข้าร่วมผ่านเกณฑ์ไม่น้อยกว่าร้อยละ 80";
    details.expenseItems = [
      {
        category: "ค่าใช้สอย",
        description: "ค่าอาหารและอาหารว่าง",
        rate: 100,
        units: 50,
        quantity: 1,
        occurrences: 1,
        amount: 5000,
      },
    ];

    const bytes = await createProjectProposalPdf({
      code: "PR2570-TEST",
      title: "โครงการทดสอบการสร้างข้อเสนอโครงการฉบับ PDF",
      organizationName: "สำนักงานเลขานุการ-งานแผนและงบประมาณ",
      fiscalYearLabel: "ปีงบประมาณ 2570",
      budgetRequestLabel: "BR2570-TEST · คำของบทดสอบ",
      projectType: "โครงการบริการวิชาการ",
      ownerName: "นายทดสอบ ระบบงาน",
      coordinatorName: "นางสาวประสานงาน โครงการ",
      approvedBudget: 5000,
      disbursementTarget: 100,
      startsOn: "2026-10-01",
      endsOn: "2026-12-31",
      status: "proposed",
      proposalDetails: details,
    });

    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.byteLength).toBeGreaterThan(10_000);
    const parsed = await PDFDocument.load(bytes);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(3);
    expect(parsed.getTitle()).toContain("PR2570-TEST");
    const headings = drawText.mock.calls.map(([text]) => text);
    const approvalIndex = headings.indexOf("10. การอนุมัติโครงการ");
    expect(approvalIndex).toBeGreaterThan(
      headings.indexOf("9. หัวหน้าโครงการและผู้รับผิดชอบโครงการ"),
    );
    const approvalPage = drawText.mock.instances[approvalIndex];
    const approvalCalls = drawText.mock.calls
      .map(([text, options], index) => ({ text, options, page: drawText.mock.instances[index] }))
      .slice(approvalIndex + 1)
      .filter(({ text }) => !text.startsWith("ระบบบริหารแผน") && !/^\d+ \/ \d+$/.test(text));
    expect(approvalCalls.filter(({ text }) => text === "ลงชื่อ")).toHaveLength(5);
    expect(approvalCalls.filter(({ text }) => text === "ผู้สอบทานโครงการ")).toHaveLength(2);
    expect(approvalCalls.map(({ text }) => text)).toEqual(
      expect.arrayContaining([
        "หัวหน้าโครงการ",
        "ผู้เห็นชอบโครงการ",
        "ผู้อนุมัติโครงการ",
        "นักวิเคราะห์นโยบายและแผนปฏิบัติการ",
        "หัวหน้าสำนักงานเลขานุการคณะรัฐศาสตร์",
        "รองคณบดีคณะรัฐศาสตร์",
        "คณบดีคณะรัฐศาสตร์ ปฏิบัติการแทน",
        "อธิการบดีมหาวิทยาลัยอุบลราชธานี",
      ]),
    );
    for (const call of approvalCalls) {
      expect(call.page).toBe(approvalPage);
      expect(call.options?.y).toBeGreaterThanOrEqual(54);
      expect(call.options?.x).toBeGreaterThanOrEqual(42);
    }
    if (process.env.WRITE_PROJECT_PDF_FIXTURE === "1") {
      const outputDirectory = resolve("tmp/pdfs");
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(resolve(outputDirectory, "project-proposal-sample.pdf"), bytes);
    }
  });
});
