"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  revalidateOperationPaths,
  sessionExpired,
} from "@/features/shared/server-actions";
import { remainingBudget } from "@/features/shared/operation-rules";
import { formatThaiInteger } from "@/features/shared/formatters";
import { INPUT_LIMITS, VALIDATION_LIMITS } from "@/lib/config/limits";

const disbursementSchema = z.object({
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  // Retained fiscal-year IDs are valid PostgreSQL UUIDs without RFC version bits.
  // The selected project's year is still checked below, using the caller's RLS.
  fiscalYearId: z.guid("ปีงบประมาณของโครงการไม่ถูกต้อง กรุณาเลือกโครงการใหม่หรือแจ้งผู้ดูแลระบบ"),
  quarter: z.coerce
    .number()
    .int("กรุณาเลือกไตรมาส 1–4")
    .min(VALIDATION_LIMITS.quarterMinimum, "กรุณาเลือกไตรมาส 1–4")
    .max(VALIDATION_LIMITS.quarterMaximum, "กรุณาเลือกไตรมาส 1–4"),
  amount: z.coerce.number().finite().positive("ยอดเบิกจ่ายต้องมากกว่า 0"),
  disbursedOn: z.string().date("กรุณาระบุวันที่เบิกจ่าย"),
  referenceNo: z.string().trim().max(INPUT_LIMITS.shortText, "เลขที่เอกสารยาวเกินกำหนด"),
  status: z.enum(["recorded", "reconciled", "pending_docs", "delayed"], {
    error: "กรุณาเลือกสถานะเอกสาร",
  }),
});

export async function saveDisbursementAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  // Do not retain errors from an earlier attempt when a different check fails.
  previous = { ...previous, errors: undefined, success: false };
  const parsed = disbursementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  const { supabase, userId } = await authenticated();
  if (!userId) return sessionExpired(previous);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("organization_id,fiscal_year_id,approved_budget,disbursed_amount")
    .eq("id", input.projectId)
    .single();
  if (projectError) {
    return {
      ...previous,
      success: false,
      message: friendlyError(projectError, "disbursements.project"),
    };
  }
  if (!project) {
    return { ...previous, success: false, message: "ไม่พบโครงการหรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  if (project.fiscal_year_id !== input.fiscalYearId) {
    return {
      ...previous,
      success: false,
      errors: { fiscalYearId: ["ปีงบประมาณไม่ตรงกับโครงการ กรุณาเลือกโครงการใหม่"] },
      message: "ปีงบประมาณไม่ตรงกับโครงการ",
    };
  }

  const remaining = remainingBudget(
    Number(project.approved_budget),
    Number(project.disbursed_amount),
  );
  if (input.amount > remaining) {
    return {
      ...previous,
      success: false,
      errors: { amount: [`ยอดสูงกว่าวงเงินคงเหลือ ${formatThaiInteger(remaining)} บาท`] },
      message: "ไม่สามารถบันทึกยอดเกินวงเงินอนุมัติ",
    };
  }

  const { data, error } = await supabase
    .from("disbursements")
    .insert({
      project_id: input.projectId,
      organization_id: project.organization_id,
      fiscal_year_id: input.fiscalYearId,
      quarter: input.quarter,
      amount: input.amount,
      disbursed_on: input.disbursedOn,
      reference_no: input.referenceNo || null,
      status: input.status,
      created_by: userId,
      updated_by: userId,
    })
    .select("id,version")
    .single();
  if (error) return { ...previous, success: false, message: friendlyError(error) };

  revalidateOperationPaths("/", "/disbursements", "/projects");
  return {
    success: true,
    id: data.id,
    version: data.version,
    message: "บันทึกการเบิกจ่ายและปรับยอดโครงการแล้ว",
  };
}
