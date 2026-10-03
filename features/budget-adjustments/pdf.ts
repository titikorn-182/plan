import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PDFDocument, PageSizes, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { adjustmentTotals, SIGNER_ROLES, type BudgetAdjustment } from "./schema";
import {
  formatMoney,
  formatThaiDate,
  wrapText as wrapPdfText,
} from "@/features/projects/project-proposal-pdf-builder";

const PAGE_WIDTH = PageSizes.A4[0];
const BODY_LEFT = 72;
const BODY_WIDTH = PAGE_WIDTH - BODY_LEFT - 65;
const TABLE_LEFT = 36;
const TABLE_WIDTH = PAGE_WIDTH - 2 * TABLE_LEFT;
const SIGN_LEFT = 29;
const SIGN_WIDTH = PAGE_WIDTH - 2 * SIGN_LEFT;
const BOTTOM = 42;
const INK = rgb(0, 0, 0);
// TH Sarabun uses a smaller visible glyph size per em than the UI's Sarabun.
const FONT_SCALE = 1.5;
const wrapText = (text: string, font: PDFFont, size: number, width: number) =>
  wrapPdfText(text, font, size * FONT_SCALE, width);

/** University memorandum based on the supplied A4 reference; long content flows safely. */
export async function createBudgetAdjustmentPdf(data: BudgetAdjustment): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const load = (weight: string) =>
    readFile(
      resolve(
        process.cwd(),
        `public/fonts/th-sarabun-new/${weight === "400" ? "regular" : "bold"}.ttf`,
      ),
    );
  const [regular, bold, logo] = await Promise.all([
    load("400").then((bytes) => doc.embedFont(bytes, { subset: true })),
    load("700").then((bytes) => doc.embedFont(bytes, { subset: true })),
    readFile(resolve(process.cwd(), "public/branding/ubu-emblem.png")).then((bytes) =>
      doc.embedPng(bytes),
    ),
  ]);
  doc.setTitle(`ขออนุมัติปรับงบประมาณ พ.ศ. ${data.fiscalYear} ${data.project}`);
  doc.setAuthor("คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี");
  doc.setSubject("บันทึกข้อความสำหรับเสนออนุมัตินอกระบบ");
  let page: PDFPage;
  let y = 0;
  function draw(value: string, x: number, baseline: number, size = 10.5, font = regular) {
    page.drawText(value || " ", { x, y: baseline, size: size * FONT_SCALE, font, color: INK });
  }
  function newPage() {
    page = doc.addPage(PageSizes.A4);
    y = PageSizes.A4[1] - 48;
    if (doc.getPageCount() > 1) {
      draw(`ขออนุมัติปรับงบประมาณ ประจำปีงบประมาณ พ.ศ. ${data.fiscalYear} (ต่อ)`, BODY_LEFT, y, 9);
      y -= 25;
    }
  }
  function ensure(height: number) {
    if (y - height < BOTTOM) newPage();
  }
  function paragraph(value: string, indent = 0, size = 10.5) {
    const lines = wrapText(value, regular, size, BODY_WIDTH - indent);
    for (const line of lines) {
      ensure(16);
      draw(line, BODY_LEFT + indent, y, size);
      y -= 16;
    }
  }
  function labelled(label: string, value: string, x: number, width: number, labelWidth: number) {
    const lines = wrapText(value, regular, 10.5, width - labelWidth);
    draw(label, x, y, 11, bold);
    lines.forEach((line, i) => draw(line, x + labelWidth, y - i * 16));
    return Math.max(1, lines.length) * 16;
  }
  newPage();
  const logoHeight = 54;
  page!.drawImage(logo, {
    x: 68,
    y: PageSizes.A4[1] - 25 - logoHeight,
    width: (logoHeight * logo.width) / logo.height,
    height: logoHeight,
  });
  const title = "บันทึกข้อความ";
  draw(title, (PAGE_WIDTH - bold.widthOfTextAtSize(title, 20 * FONT_SCALE)) / 2, 765, 20, bold);
  y = 744;
  const departmentHeight = labelled("ส่วนงาน", data.department, BODY_LEFT, 357, 44);
  const phoneHeight = labelled("โทร.", data.phone, 432, 100, 25);
  y -= Math.max(departmentHeight, phoneHeight) + 2;
  const referenceHeight = labelled("ที่", data.reference, BODY_LEFT, 218, 34);
  const dateHeight = labelled("วันที่", formatThaiDate(data.date), 292, 238, 38);
  y -= Math.max(referenceHeight, dateHeight) + 2;
  y -= labelled(
    "เรื่อง",
    `ขออนุมัติปรับงบประมาณ ประจำปีงบประมาณ พ.ศ. ${data.fiscalYear}`,
    BODY_LEFT,
    BODY_WIDTH,
    34,
  );
  paragraph(`โครงการ ${data.project}`, 34);
  y -= 2;
  y -= labelled("เรียน", data.recipient, BODY_LEFT, BODY_WIDTH, 34);
  y -= 12;
  paragraph(
    `ด้วยข้าพเจ้า ${data.head} หัวหน้าโครงการ ${data.project} ประจำปีงบประมาณ พ.ศ. ${data.fiscalYear} มีความประสงค์จะดำเนินโครงการในวันที่ ${data.schedule} ความทราบแล้วนั้น`,
    34,
  );
  paragraph(`ด้วยเหตุผลความจำเป็น ${data.reason}`, 34);
  paragraph(
    `จึงขออนุมัติปรับงบประมาณในโครงการ ${data.project} รายละเอียดในการขอปรับงบประมาณ ดังนี้`,
  );
  y -= 3;
  // Paired four-column groups preserve the reference comparison.
  const half = TABLE_WIDTH / 2;
  const widths = [66, 62, half - 184, 56, 66, 62, half - 184, 56];
  function box(x: number, top: number, width: number, height: number) {
    page.drawRectangle({ x, y: top - height, width, height, borderColor: INK, borderWidth: 0.5 });
  }
  function center(
    value: string,
    x: number,
    baseline: number,
    width: number,
    size: number,
    font: PDFFont = regular,
  ) {
    draw(
      value,
      x + (width - font.widthOfTextAtSize(value, size * FONT_SCALE)) / 2,
      baseline,
      size,
      font,
    );
  }
  const columns = [
    "รหัสโครงการ",
    "โครงการ",
    "รายการค่าใช้จ่าย",
    "งบประมาณ",
    "รหัสโครงการ",
    "โครงการ",
    "รายการค่าใช้จ่าย",
    "งบประมาณ",
  ];
  function tableHeader() {
    box(TABLE_LEFT, y, half, 17);
    box(TABLE_LEFT + half, y, half, 17);
    center("เดิม", TABLE_LEFT, y - 12, half, 9.5, bold);
    center("ปรับเป็น", TABLE_LEFT + half, y - 12, half, 9.5, bold);
    y -= 17;
    let x = TABLE_LEFT;
    columns.forEach((label, i) => {
      box(x, y, widths[i], 27);
      const lines = wrapText(label, regular, 8.5, widths[i] - 8);
      lines.forEach((line, j) => center(line, x, y - 11 - j * 11, widths[i], 8.5));
      x += widths[i];
    });
    y -= 27;
  }
  ensure(80);
  tableHeader();
  for (const row of data.rows) {
    const cells = [
      row.before.code,
      row.before.project,
      row.before.expense,
      formatMoney(Number(row.before.amount)),
      row.after.code,
      row.after.project,
      row.after.expense,
      formatMoney(Number(row.after.amount)),
    ];
    const sizes = cells.map((value, i) =>
      i === 3 || i === 7
        ? Math.max(
            6.5,
            Math.min(
              8.5,
              (8.5 * (widths[i] - 8)) / regular.widthOfTextAtSize(value, 8.5 * FONT_SCALE),
            ),
          )
        : 8.5,
    );
    const lines = cells.map((value, i) => wrapText(value, regular, sizes[i], widths[i] - 8));
    const count = Math.max(...lines.map((cell) => cell.length));
    const height = Math.max(18, count * 11 + 8);
    if (y - height < BOTTOM && height <= 690) {
      newPage();
      tableHeader();
    }
    let offset = 0;
    while (offset < count) {
      if (y - 30 < BOTTOM) {
        newPage();
        tableHeader();
      }
      const partCount = Math.min(count - offset, Math.floor((y - BOTTOM - 8) / 11));
      const partHeight = Math.max(18, partCount * 11 + 8);
      let x = TABLE_LEFT;
      lines.forEach((cell, i) => {
        box(x, y, widths[i], partHeight);
        cell.slice(offset, offset + partCount).forEach((line, j) => {
          const numeric = i === 3 || i === 7;
          draw(
            line,
            numeric
              ? x + widths[i] - 4 - regular.widthOfTextAtSize(line, sizes[i] * FONT_SCALE)
              : x + 4,
            y - 12 - j * 11,
            sizes[i],
          );
        });
        x += widths[i];
      });
      y -= partHeight;
      offset += partCount;
    }
  }
  const totals = adjustmentTotals(data.rows);
  ensure(38);
  [totals.before, totals.after].forEach((total, i) => {
    box(TABLE_LEFT + i * half, y, half, 20);
    draw(`รวม ${formatMoney(total)} บาท`, TABLE_LEFT + i * half + 8, y - 14, 9, bold);
  });
  y -= 33;
  draw(
    `ส่วนต่าง (ปรับเป็น - เดิม) ${totals.difference > 0 ? "+" : ""}${formatMoney(totals.difference)} บาท`,
    TABLE_LEFT,
    y,
    9,
  );
  y -= 22;
  paragraph("จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ", 34);
  y -= 8;
  const signHalf = SIGN_WIDTH / 2;
  const blocks = data.signers.map((signer, i) => ({
    title: wrapText(`${i + 1}) ${SIGNER_ROLES[i]}`, regular, 9, signHalf - 12),
    name: wrapText(
      `(${signer.name || "................................................"})`,
      regular,
      10,
      signHalf - 20,
    ),
    position: wrapText(
      signer.position || "ตำแหน่ง ................................................",
      regular,
      10,
      signHalf - 20,
    ),
  }));
  const heights = [0, 2, 4].map((i) =>
    Math.max(
      ...blocks
        .slice(i, i + 2)
        .map((b) => Math.max(85, (b.title.length + b.name.length + b.position.length) * 14 + 43)),
    ),
  );
  const signatureHeight = heights.reduce((a, b) => a + b, 0);
  if (y - signatureHeight < BOTTOM && signatureHeight <= 700) newPage();
  for (let index = 0; index < 6; index += 2) {
    const height = heights[index / 2];
    ensure(height);
    blocks.slice(index, index + 2).forEach((block, col) => {
      const x = SIGN_LEFT + col * signHalf;
      box(x, y, signHalf, height);
      let cursor = y - 13;
      block.title.forEach((line) => {
        draw(line, x + 6, cursor, 9);
        cursor -= 14;
      });
      cursor -= 20;
      center("ลงชื่อ ................................................", x, cursor, signHalf, 10);
      cursor -= 16;
      [...block.name, ...block.position].forEach((line) => {
        center(line, x, cursor, signHalf, 10);
        cursor -= 14;
      });
    });
    y -= height;
  }
  if (doc.getPageCount() > 1)
    doc.getPages().forEach((item, i, pages) =>
      item.drawText(`${i + 1} / ${pages.length}`, {
        x: PAGE_WIDTH - 65,
        y: 23,
        size: 8,
        font: regular,
        color: INK,
      }),
    );
  return doc.save({ useObjectStreams: false });
}
