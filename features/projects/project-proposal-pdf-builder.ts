import {
  PageSizes,
  type PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
} from "pdf-lib";
import type { ProjectStatus } from "@/features/projects/types";

export type TextStyle = {
  font?: PDFFont;
  size?: number;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
  indent?: number;
};

export type TableColumn = {
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
export const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  proposed: "ข้อเสนอ",
  active: "กำลังดำเนินงาน",
  on_hold: "พักโครงการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

const valueOrDash = (value: string | null | undefined) => value?.trim() || "-";

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatThaiDate(value: string): string {
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

export class ProposalPdfBuilder {
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
