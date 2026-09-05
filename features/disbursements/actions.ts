"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  refreshOperations,
} from "@/features/shared/server-actions";
import { remainingBudget } from "@/lib/operations/rules";

const disbursementSchema = z.object({
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  quarter: z.coerce.number().int().min(1).max(4),
  amount: z.coerce.number().finite().positive("ยอดเบิกจ่ายต้องมากกว่า 0"),
  disbursedOn: z.string().date("กรุณาระบุวันที่เบิกจ่าย"),
  referenceNo: z.string().trim().max(120),
  status: z.enum(["recorded", "reconciled", "pending_docs", "delayed"]),
});

export async function saveDisbursementAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = disbursementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("organization_id,fiscal_year_id,approved_budget,disbursed_amount")
    .eq("id", input.projectId)
    .single();
  if (projectError || !project) {
    return { ...previous, success: false, message: "ไม่พบโครงการหรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  if (project.fiscal_year_id !== input.fiscalYearId) {
    return { ...previous, success: false, message: "ปีงบประมาณไม่ตรงกับโครงการ" };
  }

  const remaining = remainingBudget(Number(project.approved_budget), Number(project.disbursed_amount));
  if (input.amount > remaining) {
    return {
      ...previous,
      success: false,
      errors: { amount: [`ยอดสูงกว่าวงเงินคงเหลือ ${remaining.toLocaleString("th-TH")} บาท`] },
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

  refreshOperations();
  return {
    success: true,
    id: data.id,
    version: data.version,
    message: "บันทึกการเบิกจ่ายและปรับยอดโครงการแล้ว",
  };
}
