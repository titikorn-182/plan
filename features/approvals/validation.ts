import { z } from "zod";
import { INPUT_LIMITS, MONEY_LIMITS } from "@/lib/config/limits";

const optionalVersion = z
  .string()
  .regex(/^[1-9]\d*$/, "กรุณาเปิดรายละเอียดคำขอใหม่ก่อนพิจารณา")
  .transform(Number)
  .pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))
  .optional();

export const approvedAmountSchema = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, "ระบุวงเงินตั้งแต่ 0 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง")
  .transform(Number)
  .pipe(z.number().finite().min(0).max(MONEY_LIMITS.maximumBaht, "วงเงินเกินขอบเขตที่ระบบรองรับ"));

export const approvalSchema = z.object({
  taskId: z.string().uuid(),
  decision: z.enum(["approved", "revision_required", "rejected"]),
  comment: z.string().trim().max(INPUT_LIMITS.reviewComment),
  expectedBudgetVersion: optionalVersion,
  approvedAmount: approvedAmountSchema.optional(),
});
