"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  title: z.string().trim().min(5, "ชื่อกิจกรรม/โครงการต้องมีอย่างน้อย 5 ตัวอักษร").max(300),
  organizationId: z.string().uuid("กรุณาเลือกหน่วยงาน"),
  fiscalYearId: z.string().uuid(),
  budgetCycleId: z.string().uuid(),
  projectType: z.string().trim().min(2, "กรุณาเลือกประเภทคำขอ").max(120),
  ownerName: z.string().trim().min(2, "กรุณาระบุผู้รับผิดชอบหลัก").max(180),
  rationale: z.string().trim().max(5000),
  amount: z.coerce.number().min(0).max(999_999_999_999),
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
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ...previous,
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "กรุณาตรวจสอบข้อมูลที่ระบุ",
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

  const { data: fiscalYear, error: fiscalError } = await supabase
    .from("fiscal_years")
    .select("buddhist_year")
    .eq("id", parsed.data.fiscalYearId)
    .single();
  if (fiscalError || !fiscalYear) {
    return {
      ...previous,
      success: false,
      message: "ไม่พบปีงบประมาณที่เลือก กรุณาเปิดแบบฟอร์มใหม่",
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
      message: conflict ?? denied ?? `บันทึกไม่สำเร็จ: ${error.message}`,
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
        message: `บันทึก ${data.code} เป็นฉบับร่างแล้ว แต่ส่งอนุมัติไม่สำเร็จ กรุณาลองส่งอีกครั้ง`,
        id: data.id,
        code: data.code,
        version: data.version,
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/budget-requests");
  revalidatePath("/approvals");
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
