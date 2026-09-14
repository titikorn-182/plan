import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
} from "pdf-lib";
import {
  EFFICIENCY_CHECKS,
  FISCAL_MONTHS,
  sumProjectExpenses,
  type ProjectProposalDetails,
} from "@/features/projects/proposal-details";
import type { ProjectStatus } from "@/features/projects/types";

export type ProjectProposalPdfData = {
  code: string;
  title: string;
  organizationName: string;
  fiscalYearLabel: string;
  budgetRequestLabel: string;
  projectType: string;
  ownerName: string;
  coordinatorName: string;
  approvedBudget: number;
  disbursementTarget: number;
  startsOn: string;
  endsOn: string;
  status: ProjectStatus;
  proposalDetails: ProjectProposalDetails;
};

type TextStyle = {
  font?: PDFFont;
  size?: number;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
  indent?: number;
};

type TableColumn = {
  label: string;
  width: number;
  align?: "left" | "right" | "center";
};

const INK = rgb(0.12, 0.1, 0.09);
const MUTED = rgb(0.4, 0.36, 0.33);
const RULE = rgb(0.86, 0.82, 0.79);
const SOFT = rgb(0.98, 0.96, 0.94);
const ORANGE = rgb(0.81, 0.23, 0.04);
const ORANGE_SOFT = rgb(1, 0.94, 0.89);
const WHITE = rgb(1, 1, 1);
const A4_WIDTH = PageSizes.A4[0];
const A4_HEIGHT = PageSizes.A4[1];
const MARGIN = 42;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

const STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: "ข้อเสนอ",
  active: "กำลังดำเนินงาน",
  on_hold: "พักโครงการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const valueOrDash = (value: string | null | undefined) => value?.trim() || "-";

function formatMoney(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatThaiDate(value: string): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function splitLongToken(token: string, font: PDFFont, size: number, width: number): string[] {
  const graphemes =
    typeof Intl.Segmenter === "function"
      ? [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(token)].map(
          (item) => item.segment,
        )
      : Array.from(token);
  const lines: string[] = [];
  let current = "";
  for (const grapheme of graphemes) {
    const candidate = current + grapheme;
    if (current && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(current);
      current = grapheme;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
  const paragraphs = String(text).replace(/\r/g, "").split("\n");
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    const tokens =
      typeof Intl.Segmenter === "function"
        ? [...new Intl.Segmenter("th", { granularity: "word" }).segment(paragraph)].map(
            (item) => item.segment,
          )
        : paragraph.split(/(?<=\s)|(?=\s)/);
    let current = "";
    for (const token of tokens) {
      const candidate = current + token;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate;
        continue;
      }
      if (current.trim()) lines.push(current.trimEnd());
      const cleanToken = token.trimStart();
      if (!cleanToken) {
        current = "";
      } else if (font.widthOfTextAtSize(cleanToken, size) <= width) {
        current = cleanToken;
      } else {
        const fragments = splitLongToken(cleanToken, font, size, width);
        lines.push(...fragments.slice(0, -1));
        current = fragments.at(-1) ?? "";
      }
    }
    if (current || !tokens.length) lines.push(current.trimEnd());
  }
  return lines.length ? lines : [""];
}

class ProposalPdfBuilder {
  private page!: PDFPage;
  private y = A4_HEIGHT - MARGIN;
  private readonly pages: PDFPage[] = [];

  constructor(
    private readonly document: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly latin: PDFFont,
    private readonly logo: PDFImage,
    private readonly projectCode: string,
  ) {
    this.addPage(true);
  }

  private addPage(firstPage = false) {
    this.page = this.document.addPage(PageSizes.A4);
    this.pages.push(this.page);
    this.y = A4_HEIGHT - MARGIN;
    if (!firstPage) {
      this.page.drawText(`ข้อเสนอโครงการ · ${this.projectCode}`, {
        x: MARGIN,
        y: this.y - 8,
        size: 8.5,
        font: this.bold,
        color: MUTED,
      });
      this.page.drawLine({
        start: { x: MARGIN, y: this.y - 15 },
        end: { x: A4_WIDTH - MARGIN, y: this.y - 15 },
        thickness: 0.7,
        color: RULE,
      });
      this.y -= 31;
    }
  }

  private ensureSpace(height: number) {
    if (this.y - height < 54) this.addPage();
  }

  header(title: string, fiscalYearLabel: string, status: string) {
    const logoHeight = 58;
    const logoWidth = (this.logo.width / this.logo.height) * logoHeight;
    this.page.drawImage(this.logo, {
      x: MARGIN,
      y: this.y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
    this.page.drawText("คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี", {
      x: MARGIN + logoWidth + 14,
      y: this.y - 15,
      size: 10,
      font: this.bold,
      color: ORANGE,
    });
    this.page.drawText("ข้อเสนอโครงการ", {
      x: MARGIN + logoWidth + 14,
      y: this.y - 40,
      size: 23,
      font: this.bold,
      color: INK,
    });
    this.page.drawText(fiscalYearLabel, {
      x: MARGIN + logoWidth + 14,
      y: this.y - 56,
      size: 9.5,
      font: this.regular,
      color: MUTED,
    });
    const badgeWidth = Math.max(54, this.bold.widthOfTextAtSize(status, 8.5) + 20);
    this.page.drawRectangle({
      x: A4_WIDTH - MARGIN - badgeWidth,
      y: this.y - 25,
      width: badgeWidth,
      height: 23,
      color: ORANGE_SOFT,
      borderColor: ORANGE,
      borderWidth: 0.7,
    });
    this.page.drawText(status, {
      x: A4_WIDTH - MARGIN - badgeWidth + 10,
      y: this.y - 17,
      size: 8.5,
      font: this.bold,
      color: ORANGE,
    });
    this.y -= 79;
    this.paragraph(title, { font: this.bold, size: 16, lineHeight: 22, color: INK });
    this.y -= 2;
    this.page.drawText(`รหัสโครงการ ${this.projectCode}`, {
      x: MARGIN,
      y: this.y,
      size: 9.5,
      font: this.regular,
      color: MUTED,
    });
    this.y -= 22;
  }

  section(title: string) {
    this.ensureSpace(36);
    this.y -= 8;
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - 20,
      width: CONTENT_WIDTH,
      height: 24,
      color: SOFT,
    });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 20, width: 3, height: 24, color: ORANGE });
    this.page.drawText(title, {
      x: MARGIN + 12,
      y: this.y - 13,
      size: 11,
      font: this.bold,
      color: INK,
    });
    this.y -= 35;
  }

  paragraph(text: string, style: TextStyle = {}) {
    const font = style.font ?? this.regular;
    const size = style.size ?? 10;
    const lineHeight = style.lineHeight ?? 15;
    const indent = style.indent ?? 0;
    const lines = wrapText(valueOrDash(text), font, size, CONTENT_WIDTH - indent);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line || " ", {
        x: MARGIN + indent,
        y: this.y,
        size,
        font,
        color: style.color ?? INK,
      });
      this.y -= lineHeight;
    }
    this.y -= 3;
  }

  labeledParagraph(label: string, value: string) {
    this.ensureSpace(26);
    this.page.drawText(label, {
      x: MARGIN,
      y: this.y,
      size: 9,
      font: this.bold,
      color: MUTED,
    });
    this.y -= 15;
    this.paragraph(value, { size: 10, lineHeight: 15 });
  }

  subheading(label: string) {
    this.ensureSpace(22);
    this.page.drawText(label, {
      x: MARGIN,
      y: this.y,
      size: 9,
      font: this.bold,
      color: MUTED,
    });
    this.y -= 18;
  }

  keyValueRows(rows: Array<[string, string]>) {
    const labelWidth = 116;
    for (const [label, value] of rows) {
      const valueLines = wrapText(
        valueOrDash(value),
        this.regular,
        9.5,
        CONTENT_WIDTH - labelWidth - 12,
      );
      const rowHeight = Math.max(24, valueLines.length * 14 + 10);
      this.ensureSpace(rowHeight);
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - rowHeight + 4,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: WHITE,
        borderColor: RULE,
        borderWidth: 0.5,
      });
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - rowHeight + 4,
        width: labelWidth,
        height: rowHeight,
        color: SOFT,
      });
      this.page.drawText(label, {
        x: MARGIN + 8,
        y: this.y - 11,
        size: 8.7,
        font: this.bold,
        color: MUTED,
      });
      valueLines.forEach((line, index) => {
        this.page.drawText(line || " ", {
          x: MARGIN + labelWidth + 9,
          y: this.y - 11 - index * 14,
          size: 9.5,
          font: this.regular,
          color: INK,
        });
      });
      this.y -= rowHeight;
    }
    this.y -= 3;
  }

  bulletList(items: string[]) {
    if (!items.length) {
      this.paragraph("-");
      return;
    }
    items.forEach((item) => {
      const lines = wrapText(item, this.regular, 9.7, CONTENT_WIDTH - 18);
      this.ensureSpace(lines.length * 14 + 2);
      this.page.drawCircle({ x: MARGIN + 4, y: this.y + 3, size: 1.8, color: ORANGE });
      lines.forEach((line, index) => {
        this.page.drawText(line, {
          x: MARGIN + 14,
          y: this.y - index * 14,
          size: 9.7,
          font: this.regular,
          color: INK,
        });
      });
      this.y -= lines.length * 14 + 3;
    });
    this.y -= 2;
  }

  table(columns: TableColumn[], rows: string[][]) {
    const padding = 5;
    const headerHeight = 27;
    const drawHeader = () => {
      this.ensureSpace(headerHeight + 24);
      let x = MARGIN;
      columns.forEach((column) => {
        this.page.drawRectangle({
          x,
          y: this.y - headerHeight + 4,
          width: column.width,
          height: headerHeight,
          color: ORANGE_SOFT,
          borderColor: RULE,
          borderWidth: 0.5,
        });
        const lines = wrapText(column.label, this.bold, 8, column.width - padding * 2).slice(0, 2);
        lines.forEach((line, index) => {
          const textWidth = this.bold.widthOfTextAtSize(line, 8);
          const textX =
            column.align === "right"
              ? x + column.width - padding - textWidth
              : column.align === "center"
                ? x + (column.width - textWidth) / 2
                : x + padding;
          this.page.drawText(line, {
            x: textX,
            y: this.y - 12 - index * 10,
            size: 8,
            font: this.bold,
            color: INK,
          });
        });
        x += column.width;
      });
      this.y -= headerHeight;
    };

    drawHeader();
    const bodyRows = rows.length ? rows : [["ไม่มีข้อมูล", ...columns.slice(1).map(() => "-")]];
    bodyRows.forEach((row) => {
      const wrapped = columns.map((column, index) =>
        wrapText(valueOrDash(row[index]), this.regular, 8.3, column.width - padding * 2),
      );
      const rowHeight = Math.max(24, Math.max(...wrapped.map((lines) => lines.length)) * 11 + 10);
      if (this.y - rowHeight < 54) {
        this.addPage();
        drawHeader();
      }
      let x = MARGIN;
      columns.forEach((column, index) => {
        this.page.drawRectangle({
          x,
          y: this.y - rowHeight + 4,
          width: column.width,
          height: rowHeight,
          color: WHITE,
          borderColor: RULE,
          borderWidth: 0.5,
        });
        wrapped[index].forEach((line, lineIndex) => {
          const textWidth = this.regular.widthOfTextAtSize(line, 8.3);
          const textX =
            column.align === "right"
              ? x + column.width - padding - textWidth
              : column.align === "center"
                ? x + (column.width - textWidth) / 2
                : x + padding;
          this.page.drawText(line || " ", {
            x: textX,
            y: this.y - 11 - lineIndex * 11,
            size: 8.3,
            font: this.regular,
            color: INK,
          });
        });
        x += column.width;
      });
      this.y -= rowHeight;
    });
    this.y -= 5;
  }

  amountSummary(label: string, amount: number) {
    this.ensureSpace(36);
    const value = `${formatMoney(amount)} บาท`;
    const valueWidth = this.bold.widthOfTextAtSize(value, 11);
    this.page.drawText(label, {
      x: MARGIN,
      y: this.y - 3,
      size: 10,
      font: this.bold,
      color: INK,
    });
    this.page.drawText(value, {
      x: A4_WIDTH - MARGIN - valueWidth,
      y: this.y - 3,
      size: 11,
      font: this.bold,
      color: ORANGE,
    });
    this.y -= 25;
  }

  finish() {
    const total = this.pages.length;
    this.pages.forEach((page, index) => {
      page.drawLine({
        start: { x: MARGIN, y: 40 },
        end: { x: A4_WIDTH - MARGIN, y: 40 },
        thickness: 0.5,
        color: RULE,
      });
      page.drawText("ระบบบริหารแผน คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี", {
        x: MARGIN,
        y: 25,
        size: 7.5,
        font: this.regular,
        color: MUTED,
      });
      const pageNumber = `${index + 1} / ${total}`;
      const width = this.latin.widthOfTextAtSize(pageNumber, 7.5);
      page.drawText(pageNumber, {
        x: A4_WIDTH - MARGIN - width,
        y: 25,
        size: 7.5,
        font: this.latin,
        color: MUTED,
      });
    });
  }
}

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
