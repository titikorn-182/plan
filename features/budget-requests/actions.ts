"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { INPUT_LIMITS } from "@/lib/config/limits";
import { friendlyError, revalidateOperationPaths } from "@/features/shared/server-actions";
import {
  getBudgetExpenseTotal,
  MAX_BUDGET_REQUEST_AMOUNT,
  parseBudgetExpenseBreakdown,
} from "@/features/budget-requests/expense-categories";

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  title: z
    .string()
    .trim()
    .min(5, "ชื่อกิจกรรม/โครงการต้องมีอย่างน้อย 5 ตัวอักษร")
    .max(INPUT_LIMITS.title),
  organizationId: z.string().uuid("กรุณาเลือกหน่วยงาน"),
  fiscalYearId: z.string().uuid(),
  budgetCycleId: z.string().uuid(),
  projectType: z.string().trim().min(2, "กรุณาเลือกประเภทคำขอ").max(INPUT_LIMITS.shortText),
  ownerName: z.string().trim().min(2, "กรุณาระบุผู้รับผิดชอบหลัก").max(INPUT_LIMITS.personName),
  rationale: z.string().trim().max(INPUT_LIMITS.longText),
  amount: z.coerce.number().min(0).max(MAX_BUDGET_REQUEST_AMOUNT),
});

export interface BudgetRequestState {
  success?: boolean;
  message?: string;
  id?: string;
  code?: string;
  version?: number;
  errors?: Record<string, string[]>;
}

export async function saveBudgetRequestAction(
  previous: BudgetRequestState,
  formData: FormData,
): Promise<BudgetRequestState> {
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    // Avoid a named "id" input shadowing form.id and dropping React's submitter value.
    id: formData.get("id") ?? formData.get("budgetRequestId") ?? "",
  });
  if (!parsed.success) {
    return {
      ...previous,
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "กรุณาตรวจสอบข้อมูลที่ระบุ",
    };
  }
  const expenseBreakdown = parseBudgetExpenseBreakdown(formData.get("expenseBreakdown"));
  if (!expenseBreakdown.success) {
    return {
      ...previous,
      success: false,
      errors: expenseBreakdown.errors,
      message: "กรุณาตรวจสอบจำนวนเงินในหมวดค่าใช้จ่าย",
    };
  }
  if (
    expenseBreakdown.data !== null &&
    getBudgetExpenseTotal(expenseBreakdown.data) !== parsed.data.amount
  ) {
    return {
      ...previous,
      success: false,
      errors: { expenseBreakdown: ["ผลรวมหมวดค่าใช้จ่ายต้องตรงกับวงเงินคำขอรวม"] },
      message: "กรุณาตรวจสอบวงเงินคำขอรวม",
    };
  }
  if (parsed.data.intent === "submit" && parsed.data.rationale.length < 20) {
    return {
      ...previous,
      success: false,
      errors: { rationale: ["ก่อนส่งคำขอ กรุณาอธิบายหลักการและเหตุผลอย่างน้อย 20 ตัวอักษร"] },
      message: "ข้อมูลยังไม่พร้อมส่ง",
    };
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  const [fiscalYearResult, budgetCycleResult] = await Promise.all([
    supabase
      .from("fiscal_years")
      .select("buddhist_year")
      .eq("id", parsed.data.fiscalYearId)
      .single(),
    supabase
      .from("budget_cycles")
      .select("fiscal_year_id")
      .eq("id", parsed.data.budgetCycleId)
      .single(),
  ]);
  const periodError = fiscalYearResult.error ?? budgetCycleResult.error;
  if (periodError) {
    return {
      ...previous,
      success: false,
      message: friendlyError(periodError, "budget_requests.fiscal_year"),
    };
  }
  const fiscalYear = fiscalYearResult.data;
  if (!fiscalYear || !budgetCycleResult.data) {
    return {
      ...previous,
      success: false,
      message: "ไม่พบปีงบประมาณหรือรอบรับคำขอที่เลือก กรุณาเปิดแบบฟอร์มใหม่",
    };
  }
  if (budgetCycleResult.data.fiscal_year_id !== parsed.data.fiscalYearId) {
    return {
      ...previous,
      success: false,
      errors: { fiscalYearId: ["ปีงบประมาณไม่ตรงกับรอบรับคำขอ กรุณาเลือกใหม่"] },
      message: "ปีงบประมาณที่เลือกไม่ถูกต้อง",
    };
  }

  const values = {
    fiscal_year_id: parsed.data.fiscalYearId,
    budget_cycle_id: parsed.data.budgetCycleId,
    organization_id: parsed.data.organizationId,
    owner_name: parsed.data.ownerName,
    coordinator_name: parsed.data.ownerName,
    title_th: parsed.data.title,
    category: parsed.data.projectType.includes("ครุภัณฑ์")
      ? "ครุภัณฑ์"
      : parsed.data.projectType.includes("ก่อสร้าง")
        ? "สิ่งก่อสร้าง"
        : "ดำเนินงาน",
    project_type: parsed.data.projectType,
    rationale: parsed.data.rationale,
    requested_amount: parsed.data.amount,
    expense_breakdown: expenseBreakdown.data,
    status: "draft" as const,
    submitted_at: null,
    updated_by: userId,
  };

  const mutation = parsed.data.id
    ? supabase
        .from("budget_requests")
        .update(values)
        .eq("id", parsed.data.id)
        .eq("version", parsed.data.version)
        .in("status", ["draft", "revision_required"])
        .select("id,code,version")
        .maybeSingle()
    : supabase
        .from("budget_requests")
        .insert({
          ...values,
          owner_id: userId,
          coordinator_id: userId,
          code: `BR${String(fiscalYear.buddhist_year).slice(-2)}${Date.now().toString().slice(-8)}`,
          created_by: userId,
        })
        .select("id,code,version")
        .single();

  const { data, error } = await mutation;
  if (error) {
    const conflict = error.code === "23505" ? "รหัสคำขอซ้ำ กรุณาลองบันทึกอีกครั้ง" : null;
    const denied =
      error.code === "42501" ? "คุณไม่มีสิทธิ์บันทึกคำขอสำหรับหน่วยงานหรือสถานะนี้" : null;
    return {
      ...previous,
      success: false,
      message: conflict ?? denied ?? friendlyError(error, "budget_requests.save"),
      id: parsed.data.id || previous.id,
      version: parsed.data.version,
    };
  }
  if (!data) {
    return {
      ...previous,
      success: false,
      message: "ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น กรุณากลับไปเปิดรายการใหม่อีกครั้ง",
    };
  }

  if (parsed.data.intent === "submit") {
    const { error: workflowError } = await supabase.rpc("submit_budget_request_for_approval", {
      p_entity_id: data.id,
      p_comment: "ส่งคำของบประมาณเพื่อพิจารณา",
    });
    if (workflowError) {
      return {
        success: false,
        message: `บันทึก ${data.code} เป็นฉบับร่างแล้ว แต่ส่งอนุมัติไม่สำเร็จ: ${friendlyError(
          workflowError,
          "budget_requests.submit",
        )}`,
        id: data.id,
        code: data.code,
        version: data.version,
      };
    }
  }

  revalidateOperationPaths(
    "/",
    "/budget-requests",
    ...(parsed.data.intent === "submit" ? ["/approvals", "/notifications"] : []),
  );
  return {
    success: true,
    message:
      parsed.data.intent === "submit"
        ? `ส่งคำขอ ${data.code} เข้าสู่กระบวนการตรวจสอบแล้ว`
        : `บันทึกฉบับร่าง ${data.code} แล้ว`,
    id: data.id,
    code: data.code,
    version: data.version,
  };
}
