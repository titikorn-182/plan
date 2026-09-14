import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  EFFICIENCY_CHECKS,
  FISCAL_MONTHS,
  sumProjectExpenses,
} from "@/features/projects/proposal-details";
import {
  CONTENT_WIDTH,
  ProposalPdfBuilder,
  STATUS_LABELS,
  formatMoney,
  formatThaiDate,
} from "@/features/projects/project-proposal-pdf-builder";
import type { ProjectProposalPdfData } from "@/features/projects/project-proposal-pdf-data";

export type { ProjectProposalPdfData } from "@/features/projects/project-proposal-pdf-data";

export async function createProjectProposalPdf(data: ProjectProposalPdfData): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const [regularBytes, boldBytes, logoBytes] = await Promise.all([
    readFile(
      resolve(process.cwd(), "node_modules/@openfonts/sarabun_all/files/sarabun-all-400.woff"),
    ),
    readFile(
      resolve(process.cwd(), "node_modules/@openfonts/sarabun_all/files/sarabun-all-700.woff"),
    ),
    readFile(resolve(process.cwd(), "public/branding/political-science-ubu.png")),
  ]);
  const [regular, bold, latin, logo] = await Promise.all([
    document.embedFont(regularBytes, { subset: true }),
    document.embedFont(boldBytes, { subset: true }),
    document.embedFont(StandardFonts.Helvetica),
    document.embedPng(logoBytes),
  ]);
  document.setTitle(`ข้อเสนอโครงการ ${data.code} ${data.title}`);
  document.setAuthor("คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี");
  document.setSubject("ข้อเสนอโครงการจากระบบบริหารแผน");
  document.setCreator("ระบบบริหารแผน");

  const pdf = new ProposalPdfBuilder(document, regular, bold, latin, logo, data.code);
  const details = data.proposalDetails;
  pdf.header(data.title, data.fiscalYearLabel, STATUS_LABELS[data.status]);

  pdf.section("1. ข้อมูลโครงการ");
  pdf.keyValueRows([
    ["หน่วยงานเจ้าของโครงการ", data.organizationName],
    ["ปีงบประมาณ", data.fiscalYearLabel],
    ["อ้างอิงคำของบที่อนุมัติ", data.budgetRequestLabel],
    ["ประเภทโครงการ", data.projectType],
    ["หัวหน้าโครงการ", data.ownerName],
    ["ตำแหน่งหัวหน้าโครงการ", details.projectHeadPosition],
    ["ผู้ประสานงาน", data.coordinatorName],
    ["ระยะเวลาดำเนินการ", `${formatThaiDate(data.startsOn)} - ${formatThaiDate(data.endsOn)}`],
    [
      "สัปดาห์เริ่ม/สิ้นสุด",
      `สัปดาห์ที่ ${details.startWeek ?? "-"} / สัปดาห์ที่ ${details.endWeek ?? "-"}`,
    ],
    ["สถานที่ดำเนินการ", details.location],
  ]);

  pdf.section("2. ลักษณะและความสอดคล้องของโครงการ");
  pdf.subheading("ลักษณะโครงการ");
  pdf.bulletList([
    ...details.characteristics,
    ...(details.otherCharacteristic ? [`อื่น ๆ: ${details.otherCharacteristic}`] : []),
  ]);
  pdf.subheading("กลยุทธ์คณะ");
  pdf.bulletList(details.strategies);
  pdf.keyValueRows([
    [
      "ประเภทความต่อเนื่อง",
      details.continuity === "continuing" ? "โครงการต่อเนื่อง" : "โครงการใหม่",
    ],
    ["ผลสำเร็จในปีที่ผ่านมา", details.previousSuccess],
  ]);
  pdf.subheading("เงื่อนไขประสิทธิภาพการดำเนินงาน");
  pdf.bulletList(
    EFFICIENCY_CHECKS.filter((item) => details.efficiencyChecks.includes(item.value)).map(
      (item) => item.label,
    ),
  );

  pdf.section("3. หลักการ เป้าหมาย และผลที่คาดว่าจะได้รับ");
  pdf.labeledParagraph("หลักการและเหตุผล", details.rationale);
  pdf.labeledParagraph("วัตถุประสงค์", details.objectives);
  pdf.labeledParagraph("กลุ่มเป้าหมาย", details.targetGroup);
  pdf.labeledParagraph("ประโยชน์/ผลที่คาดว่าจะได้รับ", details.expectedResults);

  pdf.section("4. เป้าหมายและตัวชี้วัด");
  pdf.table(
    [
      { label: "เป้าประสงค์", width: 126 },
      { label: "ตัวชี้วัดระยะยาว", width: 112 },
      { label: "ตัวชี้วัดแผนปฏิบัติการ", width: 120 },
      { label: "หน่วย", width: 58, align: "center" },
      { label: "ค่าเป้าหมาย", width: CONTENT_WIDTH - 416, align: "center" },
    ],
    details.goalIndicators.map((item) => [
      item.goal,
      item.longTermIndicator,
      item.actionIndicator,
      item.unit,
      item.target,
    ]),
  );
  pdf.labeledParagraph("ตัวชี้วัดระดับกระบวนการ", details.processIndicator);
  pdf.labeledParagraph("ตัวชี้วัดระดับผลผลิต", details.outputIndicator);

  pdf.section("5. ความเชื่อมโยงกับการพัฒนาที่ยั่งยืน (SDGs)");
  pdf.bulletList(details.sdgs);
  pdf.labeledParagraph("คำอธิบายความเชื่อมโยง", details.sdgAlignmentDescription);

  pdf.section("6. โครงสร้างแผนและกิจกรรม");
  pdf.keyValueRows([
    ["รหัสผลผลิต/โครงการ (4 หลัก)", details.outputCode],
    ["ชื่อผลผลิต/โครงการ", details.outputName],
    ["รหัสโครงการย่อย (8 หลัก)", details.operationalPlanCode],
    ["ชื่อโครงการย่อย", details.operationalPlanName],
    ["รหัสกิจกรรม (12 หลัก)", details.activityCode],
    ["ชื่อกิจกรรม/โครงการ", details.projectActivityName],
  ]);

  pdf.section("7. แผนปฏิบัติการ");
  pdf.table(
    [
      { label: "กิจกรรม", width: 248 },
      { label: "เดือนดำเนินงาน", width: CONTENT_WIDTH - 248 },
    ],
    details.actionPlan.map((item) => [
      item.description,
      item.months
        .slice()
        .sort((a, b) => a - b)
        .map((month) => FISCAL_MONTHS[month])
        .join(", "),
    ]),
  );

  pdf.section("8. รายละเอียดงบประมาณ");
  pdf.keyValueRows([
    ["งบประมาณที่ได้รับอนุมัติ", `${formatMoney(data.approvedBudget)} บาท`],
    ["เป้าหมายเบิกจ่าย", `${formatMoney(data.disbursementTarget)}%`],
  ]);
  pdf.table(
    [
      { label: "หมวด", width: 63 },
      { label: "รายการค่าใช้จ่าย", width: 154 },
      { label: "อัตรา", width: 62, align: "right" },
      { label: "หน่วย", width: 46, align: "right" },
      { label: "จำนวน", width: 46, align: "right" },
      { label: "ครั้ง", width: 42, align: "right" },
      { label: "รวม (บาท)", width: CONTENT_WIDTH - 413, align: "right" },
    ],
    details.expenseItems.map((item) => [
      item.category,
      item.description,
      formatMoney(item.rate),
      String(item.units),
      String(item.quantity),
      String(item.occurrences),
      formatMoney(item.amount),
    ]),
  );
  pdf.amountSummary("รวมรายละเอียดค่าใช้จ่าย", sumProjectExpenses(details));

  pdf.section("9. หัวหน้าโครงการและผู้รับผิดชอบโครงการ");
  pdf.keyValueRows([
    ["หัวหน้าโครงการ", data.ownerName],
    ["ตำแหน่ง", details.projectHeadPosition],
    ["ผู้ประสานงาน", data.coordinatorName],
  ]);
  pdf.table(
    [
      { label: "ชื่อผู้รับผิดชอบ", width: CONTENT_WIDTH * 0.58 },
      { label: "ตำแหน่ง", width: CONTENT_WIDTH * 0.42 },
    ],
    details.responsiblePeople.map((person) => [person.name, person.position]),
  );

  pdf.finish();
  return document.save();
}
