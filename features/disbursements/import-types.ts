import { z } from "zod";
import { IMPORT_LIMITS, INPUT_LIMITS, VALIDATION_LIMITS } from "@/lib/config/limits";

export const DISBURSEMENT_IMPORT_MAX_BYTES = IMPORT_LIMITS.disbursementBytes;
export const DISBURSEMENT_IMPORT_MAX_ROWS = IMPORT_LIMITS.disbursementRows;

export const importedDisbursementSchema = z.object({
  rowNumber: z.number().int().min(2),
  projectCode: z.string().trim().min(1, "กรุณาระบุรหัสโครงการ").max(INPUT_LIMITS.shortText),
  quarter: z.coerce
    .number()
    .int()
    .min(VALIDATION_LIMITS.quarterMinimum, "ไตรมาสต้องอยู่ระหว่าง 1–4")
    .max(VALIDATION_LIMITS.quarterMaximum),
  amount: z.coerce.number().finite().positive("ยอดเบิกจ่ายต้องมากกว่า 0"),
  disbursedOn: z.string().date("วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD"),
  referenceNo: z
    .string()
    .trim()
    .max(INPUT_LIMITS.shortText, `เลขอ้างอิงยาวเกิน ${INPUT_LIMITS.shortText} ตัวอักษร`),
  status: z.enum(["recorded", "reconciled", "pending_docs", "delayed"]),
});

export type ImportedDisbursement = z.infer<typeof importedDisbursementSchema>;

export type ImportIssue = {
  field: string;
  message: string;
  rowNumber: number;
};

export type DisbursementImportPreview = {
  errors: ImportIssue[];
  fileName: string;
  message: string;
  rows: ImportedDisbursement[];
  success: boolean;
};

export type DisbursementImportResult = {
  inserted: number;
  message: string;
  success: boolean;
};
