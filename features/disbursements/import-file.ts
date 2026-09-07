import "server-only";

import ExcelJS from "exceljs";
import {
  DISBURSEMENT_IMPORT_MAX_BYTES,
  DISBURSEMENT_IMPORT_MAX_ROWS,
  importedDisbursementSchema,
  type ImportedDisbursement,
  type ImportIssue,
} from "@/features/disbursements/import-types";

const EXPECTED_HEADERS = [
  "project_code",
  "quarter",
  "amount",
  "disbursed_on",
  "reference_no",
  "status",
] as const;

type RawCell = string | number | Date | null;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function cellText(value: RawCell): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === null ? "" : String(value).trim();
}

function excelDate(value: RawCell): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
    return date.toISOString().slice(0, 10);
  }
  return cellText(value);
}

function normalizeStatus(value: RawCell): string {
  const normalized = cellText(value).toLowerCase();
  const aliases: Record<string, string> = {
    ตามแผน: "recorded",
    กระทบยอดแล้ว: "reconciled",
    รอเอกสาร: "pending_docs",
    ล่าช้า: "delayed",
  };
  return aliases[normalized] ?? normalized;
}

function normalizeRows(rows: RawCell[][]): {
  errors: ImportIssue[];
  rows: ImportedDisbursement[];
} {
  const errors: ImportIssue[] = [];
  if (rows.length === 0) {
    return { rows: [], errors: [{ rowNumber: 1, field: "file", message: "ไฟล์ไม่มีข้อมูล" }] };
  }
  const headerIndex = rows.findIndex((row) =>
    EXPECTED_HEADERS.every(
      (header, index) =>
        cellText(row[index] ?? null)
          .toLowerCase()
          .replace(/^\uFEFF/, "") === header,
    ),
  );
  const headers = (rows[headerIndex < 0 ? 0 : headerIndex] ?? []).map((value) =>
    cellText(value)
      .toLowerCase()
      .replace(/^\uFEFF/, ""),
  );
  EXPECTED_HEADERS.forEach((header, index) => {
    if (headers[index] !== header) {
      errors.push({
        rowNumber: 1,
        field: header,
        message: `คอลัมน์ที่ ${index + 1} ต้องเป็น ${header}`,
      });
    }
  });
  if (errors.length) return { rows: [], errors };

  const dataRows = rows
    .slice((headerIndex < 0 ? 0 : headerIndex) + 1)
    .filter((row) => row.some((cell) => cellText(cell) !== ""));
  if (dataRows.length > DISBURSEMENT_IMPORT_MAX_ROWS) {
    return {
      rows: [],
      errors: [
        {
          rowNumber: 1,
          field: "file",
          message: `นำเข้าได้สูงสุด ${DISBURSEMENT_IMPORT_MAX_ROWS} รายการต่อครั้ง`,
        },
      ],
    };
  }
  const validRows: ImportedDisbursement[] = [];
  dataRows.forEach((row, index) => {
    const rowNumber = index + (headerIndex < 0 ? 2 : headerIndex + 2);
    const candidate = {
      rowNumber,
      projectCode: cellText(row[0] ?? null),
      quarter: cellText(row[1] ?? null),
      amount: cellText(row[2] ?? null).replace(/,/g, ""),
      disbursedOn: excelDate(row[3] ?? null),
      referenceNo: cellText(row[4] ?? null),
      status: normalizeStatus(row[5] ?? null),
    };
    const parsed = importedDisbursementSchema.safeParse(candidate);
    if (parsed.success) validRows.push(parsed.data);
    else {
      parsed.error.issues.forEach((issue) =>
        errors.push({
          rowNumber,
          field: String(issue.path[0] ?? "row"),
          message: issue.message,
        }),
      );
    }
  });
  if (dataRows.length === 0) {
    errors.push({ rowNumber: 2, field: "file", message: "ไม่พบรายการสำหรับนำเข้า" });
  }
  return { rows: validRows, errors };
}

export async function parseDisbursementImportFile(file: File): Promise<{
  errors: ImportIssue[];
  rows: ImportedDisbursement[];
}> {
  if (file.size > DISBURSEMENT_IMPORT_MAX_BYTES) {
    return {
      rows: [],
      errors: [{ rowNumber: 1, field: "file", message: "ไฟล์ต้องมีขนาดไม่เกิน 2 MB" }],
    };
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") {
    return normalizeRows(parseCsv(await file.text()));
  }
  if (extension !== "xlsx") {
    return {
      rows: [],
      errors: [{ rowNumber: 1, field: "file", message: "รองรับเฉพาะไฟล์ .xlsx และ .csv" }],
    };
  }
  try {
    const workbook = new ExcelJS.Workbook();
    const data = await file.arrayBuffer();
    await workbook.xlsx.load(data as Parameters<typeof workbook.xlsx.load>[0]);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return normalizeRows([]);
    const rows: RawCell[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values: RawCell[] = [];
      for (let column = 1; column <= EXPECTED_HEADERS.length; column += 1) {
        const cell = row.getCell(column);
        const value = cell.value;
        values.push(value instanceof Date || typeof value === "number" ? value : cell.text || null);
      }
      rows.push(values);
    });
    return normalizeRows(rows);
  } catch {
    return {
      rows: [],
      errors: [{ rowNumber: 1, field: "file", message: "ไม่สามารถอ่านไฟล์ Excel นี้ได้" }],
    };
  }
}
