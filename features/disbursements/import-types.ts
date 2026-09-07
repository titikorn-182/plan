import { z } from "zod";

export const DISBURSEMENT_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const DISBURSEMENT_IMPORT_MAX_ROWS = 500;

export const importedDisbursementSchema = z.object({
  rowNumber: z.number().int().min(2),
  projectCode: z.string().trim().min(1, "กรุณาระบุรหัสโครงการ").max(120),
  quarter: z.coerce.number().int().min(1, "ไตรมาสต้องอยู่ระหว่าง 1–4").max(4),
  amount: z.coerce.number().finite().positive("ยอดเบิกจ่ายต้องมากกว่า 0"),
  disbursedOn: z.string().date("วันที่ต้องอยู่ในรูปแบบ YYYY-MM-DD"),
  referenceNo: z.string().trim().max(120, "เลขอ้างอิงยาวเกิน 120 ตัวอักษร"),
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
