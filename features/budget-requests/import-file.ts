import "client-only";

import type { CellValue } from "exceljs";
import {
  BUDGET_REQUEST_IMPORT_COLUMNS,
  BUDGET_REQUEST_IMPORT_HEADERS,
  BUDGET_REQUEST_SOURCE_FIELD_MAP,
  createEmptyBudgetRequestSourceValues,
  type BudgetRequestSourceKey,
  type BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 500;

type RawCell = string | number | boolean | Date | null;

export type BudgetRequestImportResult = {
  errors: string[];
  records: BudgetRequestImportedRecord[];
};

export type BudgetRequestImportedRecord = {
  errors: string[];
  rowNumber: number;
  values: BudgetRequestSourceValues;
  warnings: string[];
};

function normalizeHeader(value: RawCell): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dateForInput(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Bangkok",
    year: "numeric",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function cellText(value: RawCell, key?: BudgetRequestSourceKey): string {
  if (value instanceof Date) return dateForInput(value);
  if ((key === "startsOn" || key === "endsOn") && typeof value === "number") {
    return dateForInput(new Date(Date.UTC(1899, 11, 30) + value * 86_400_000));
  }
  const text = String(value ?? "").trim();
  if ((key === "startsOn" || key === "endsOn") && text) {
    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime()) && text.includes("T")) return dateForInput(parsed);
  }
  if (key === "totalBudget" || key === "spendingPlanTotal") return text.replace(/,/g, "");
  return text;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function parseCsv(text: string): RawCell[][] {
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

function normalizeRows(rows: RawCell[][]): BudgetRequestImportResult {
  if (rows.length === 0) return { records: [], errors: ["ไฟล์ไม่มีข้อมูล"] };
  const headers = rows[0].map(normalizeHeader);
  const duplicateHeaders = [
    ...new Set(headers.filter((header, index) => headers.indexOf(header) !== index)),
  ];
  if (duplicateHeaders.length > 0) {
    return {
      records: [],
      errors: [`พบหัวคอลัมน์ซ้ำ: ${duplicateHeaders.join(", ")}`],
    };
  }
  const missingHeaders = BUDGET_REQUEST_IMPORT_HEADERS.filter(
    (expected) => !headers.includes(normalizeHeader(expected)),
  );
  if (missingHeaders.length > 0) {
    return {
      records: [],
      errors: [
        `ไฟล์ยังขาด ${missingHeaders.length} คอลัมน์`,
        `คอลัมน์ที่ขาด: ${missingHeaders.join(", ")}`,
      ],
    };
  }
  const dataRows = rows.slice(1).filter((row) => row.some((cell) => cellText(cell) !== ""));
  if (dataRows.length === 0) return { records: [], errors: ["ไม่พบแถวข้อมูลหลังหัวตาราง"] };
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return {
      records: [],
      errors: [`ไฟล์มีข้อมูลเกิน ${MAX_IMPORT_ROWS.toLocaleString("th-TH")} แถว`],
    };
  }

  const columnIndexes = new Map(headers.map((header, index) => [header, index]));
  const records = dataRows.map((row, rowIndex) => {
    const record = createEmptyBudgetRequestSourceValues();
    for (const column of BUDGET_REQUEST_IMPORT_COLUMNS) {
      const index = columnIndexes.get(normalizeHeader(column.header));
      record[column.key] = cellText(index === undefined ? null : (row[index] ?? null), column.key);
    }
    const rowNumber = rowIndex + 2;
    const errors: string[] = [];
    const warnings: string[] = [];
    for (const key of ["totalBudget", "spendingPlanTotal"] as const) {
      const amount = record[key];
      if (amount && (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) > 999_999_999_999)) {
        errors.push(
          `แถว ${rowNumber}: ${key === "totalBudget" ? "งบประมาณรวมทั้งหมด" : "ยอดรวมแผนค่าใช้จ่าย"}ไม่ถูกต้อง`,
        );
      }
    }
    for (const key of ["startsOn", "endsOn"] as const) {
      const date = record[key];
      if (date && !isIsoDate(date)) {
        errors.push(
          `แถว ${rowNumber}: ${key === "startsOn" ? "วันที่เริ่ม" : "วันที่สิ้นสุด"}ต้องเป็นวันที่ที่ถูกต้อง`,
        );
      }
    }
    for (const column of BUDGET_REQUEST_IMPORT_COLUMNS) {
      const maxLength = BUDGET_REQUEST_SOURCE_FIELD_MAP.get(column.key)?.maxLength ?? 300;
      if (record[column.key].length > maxLength) {
        errors.push(
          `แถว ${rowNumber}: ${column.header}ยาวเกิน ${maxLength.toLocaleString("th-TH")} ตัวอักษร`,
        );
      }
    }
    if (record.startsOn && record.endsOn && record.startsOn > record.endsOn) {
      errors.push(`แถว ${rowNumber}: วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม`);
    }
    const required = [
      ["projectActivityName", "ชื่อโครงการกิจกรรม"],
      ["projectType", "ประเภทโครงการ"],
      ["ownerName", "ผู้รับผิดชอบ"],
      ["totalBudget", "งบประมาณรวมทั้งหมด"],
      ["rationale", "หลักการและเหตุผล"],
    ] as const;
    for (const [key, label] of required) {
      if (!record[key]) warnings.push(`แถว ${rowNumber}: ยังไม่ระบุ${label}`);
    }
    return { rowNumber, values: record, errors, warnings };
  });
  return { records, errors: [] };
}

function excelCellValue(value: CellValue, text: string): RawCell {
  if (value === null || value === undefined) return null;
  if (value instanceof Date || ["string", "number", "boolean"].includes(typeof value)) {
    return value as string | number | boolean | Date;
  }
  if (typeof value === "object" && "result" in value) {
    const result = value.result;
    if (
      result instanceof Date ||
      result === null ||
      result === undefined ||
      ["string", "number", "boolean"].includes(typeof result)
    ) {
      return (result ?? text) as RawCell;
    }
  }
  return text;
}

export async function parseBudgetRequestImportFile(file: File): Promise<BudgetRequestImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { records: [], errors: ["ไฟล์ต้องมีขนาดไม่เกิน 5 MB"] };
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return normalizeRows(parseCsv(await file.text()));
  if (extension !== "xlsx") {
    return { records: [], errors: ["รองรับเฉพาะไฟล์ .xlsx และ .csv"] };
  }

  try {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const data = await file.arrayBuffer();
    await workbook.xlsx.load(data as Parameters<typeof workbook.xlsx.load>[0]);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) return { records: [], errors: ["ไฟล์ Excel ไม่มีแผ่นงาน"] };
    const rows: RawCell[][] = [];
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      const values: RawCell[] = [];
      for (let column = 1; column <= worksheet.actualColumnCount; column += 1) {
        const cell = row.getCell(column);
        values.push(excelCellValue(cell.value, cell.text));
      }
      rows.push(values);
    });
    return normalizeRows(rows);
  } catch {
    return { records: [], errors: ["ไม่สามารถอ่านไฟล์ Excel นี้ได้ กรุณาตรวจสอบรูปแบบไฟล์"] };
  }
}
