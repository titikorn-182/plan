import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import { publicFailureMessage, reportServerError } from "@/lib/observability/server-logger";
import { createClient } from "@/lib/supabase/server";

export const uuidOrEmpty = z.string().uuid().optional().or(z.literal(""));
export const moneySchema = z.coerce.number().finite().min(0).max(999_999_999_999);

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
  if (error.code === "23505") return "มีรายการของรอบนี้อยู่แล้ว กรุณาเปิดรายการเดิมเพื่อแก้ไข";
  if (error.code === "23514") {
    if (error.message.includes("disbursement exceeds")) {
      return "ยอดเบิกจ่ายรวมเกินวงเงินอนุมัติของโครงการ";
    }
    return "ข้อมูลไม่ผ่านเงื่อนไขของระบบ กรุณาตรวจสอบสถานะและค่าที่กรอก";
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

export function revalidateOperationPaths(...paths: string[]): void {
  new Set(paths).forEach((path) => revalidatePath(path));
}
