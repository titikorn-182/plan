import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MONEY_LIMITS } from "@/lib/config/limits";
import type { OperationState } from "@/features/shared/action-state";
import { publicFailureMessage, reportServerError } from "@/lib/observability/server-logger";
import { createClient } from "@/lib/supabase/server";

export const uuidOrEmpty = z.string().uuid().optional().or(z.literal(""));
export const moneySchema = z.coerce.number().finite().min(0).max(MONEY_LIMITS.maximumBaht);
export const SESSION_EXPIRED_MESSAGE = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";

export function invalid(previous: OperationState, error: z.ZodError): OperationState {
  return {
    ...previous,
    success: false,
    message: "กรุณาตรวจสอบข้อมูลที่ระบุ",
    errors: error.flatten().fieldErrors,
  };
}

export function friendlyError(
  error: { code?: string; message: string },
  operation = "database_mutation",
): string {
  if (error.code === "42501") return "คุณไม่มีสิทธิ์ดำเนินการกับข้อมูลนี้";
  if (error.code === "40001") {
    return "ข้อมูลถูกแก้ไขหรือเปลี่ยนสถานะโดยผู้ใช้อื่น กรุณาเปิดรายการใหม่อีกครั้ง";
  }
  if (error.code === "23505") return "มีรายการของรอบนี้อยู่แล้ว กรุณาเปิดรายการเดิมเพื่อแก้ไข";
  if (error.code === "23514") {
    if (error.message.includes("disbursement exceeds")) {
      return "ยอดเบิกจ่ายรวมเกินวงเงินอนุมัติของโครงการ";
    }
    if (error.message === "plan structure is not valid for the selected fiscal year") {
      return "รหัส ชื่อ หรือลำดับโครงสร้างแผนและกิจกรรมไม่สัมพันธ์กัน กรุณาเลือกผลผลิต แผนปฏิบัติการ และกิจกรรมใหม่";
    }
    if (error.message === "expense category is not valid for the selected fiscal year") {
      return "งบรายจ่าย หมวดรายจ่าย และหมวดรายจ่ายย่อยไม่สัมพันธ์กัน กรุณาเลือกรายการค่าใช้จ่ายใหม่";
    }
    if (error.message === "the budget cycle is not open") {
      return "รอบรับคำของบประมาณยังไม่เปิดหรือปิดแล้ว กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบช่วงเวลารับคำขอ";
    }
    const referenceId = reportServerError(operation, error, { code: error.code });
    return `ข้อมูลไม่ผ่านเงื่อนไขของระบบ กรุณาติดต่อผู้ดูแลระบบพร้อมรหัสอ้างอิง ${referenceId}`;
  }
  return publicFailureMessage(reportServerError(operation, error, { code: error.code }));
}

export async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) return { supabase, userId: null };
  return { supabase, userId };
}

export function sessionExpired<TState extends OperationState>(
  previous: TState,
): TState & { message: string } {
  return {
    ...previous,
    success: false,
    message: SESSION_EXPIRED_MESSAGE,
  };
}

export function revalidateOperationPaths(...paths: string[]): void {
  new Set(paths).forEach((path) => revalidatePath(path));
}
