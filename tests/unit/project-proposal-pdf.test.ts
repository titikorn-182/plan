import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createProjectProposalPdf } from "@/features/projects/project-proposal-pdf";
import { createEmptyProjectProposalDetails } from "@/features/projects/proposal-details";

describe("project proposal PDF", () => {
  it("creates a readable multi-section PDF with Thai proposal data", async () => {
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
    if (process.env.WRITE_PROJECT_PDF_FIXTURE === "1") {
      const outputDirectory = resolve("tmp/pdfs");
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(resolve(outputDirectory, "project-proposal-sample.pdf"), bytes);
    }
  });
});
