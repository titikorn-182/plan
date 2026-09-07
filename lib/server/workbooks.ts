import "server-only";

import ExcelJS from "exceljs";

export type WorkbookValue = string | number | Date | null;
export type WorkbookColumn = {
  header: string;
  width?: number;
};

function safeWorkbookValue(value: WorkbookValue): WorkbookValue {
  if (typeof value !== "string") return value;
  return /^\s*[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function createWorkbookBuffer(input: {
  columns: WorkbookColumn[];
  rows: WorkbookValue[][];
  sheetName: string;
  subtitle?: string;
  title: string;
}): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ระบบบริหารจัดการงบประมาณและการบริหารกิจกรรมโครงการ";
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(input.sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  worksheet.mergeCells(1, 1, 1, input.columns.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = input.title;
  titleCell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFCF430C" } };
  titleCell.alignment = { vertical: "middle", horizontal: "left" };
  worksheet.getRow(1).height = 30;

  worksheet.mergeCells(2, 1, 2, input.columns.length);
  worksheet.getCell(2, 1).value = input.subtitle ?? "สร้างจากข้อมูลตามสิทธิ์ของผู้ใช้งาน";
  worksheet.getCell(2, 1).font = { color: { argb: "FF6B625C" }, size: 10 };
  worksheet.getRow(2).height = 22;

  const header = worksheet.getRow(3);
  header.values = input.columns.map((column) => column.header);
  header.font = { bold: true, color: { argb: "FF2B2724" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE8D9" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 26;

  input.rows.forEach((values) => worksheet.addRow(values.map(safeWorkbookValue)));
  worksheet.columns.forEach((column, index) => {
    column.width = input.columns[index]?.width ?? 18;
  });
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: "FFD8D3CF" } } };
      if (typeof cell.value === "number") cell.numFmt = "#,##0.00";
    });
  });
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: input.columns.length },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

export function workbookResponse(buffer: Uint8Array, fileName: string): Response {
  const responseBuffer = new Uint8Array(buffer.byteLength);
  responseBuffer.set(buffer);
  return new Response(responseBuffer.buffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
