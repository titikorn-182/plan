"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  moneySchema,
  refreshOperations,
  uuidOrEmpty,
} from "@/features/shared/server-actions";
import { isProjectPeriodValid } from "@/lib/operations/rules";

const projectSchema = z.object({
  id: uuidOrEmpty,
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  organizationId: z.string().uuid("กรุณาเลือกหน่วยงาน"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  budgetRequestId: uuidOrEmpty,
  title: z.string().trim().min(5, "ชื่อโครงการต้องมีอย่างน้อย 5 ตัวอักษร").max(300),
  projectType: z.string().trim().min(2, "กรุณาระบุประเภทโครงการ").max(120),
  ownerName: z.string().trim().min(2, "กรุณาระบุเจ้าของโครงการ").max(180),
  coordinatorName: z.string().trim().min(2, "กรุณาระบุผู้ประสานงาน").max(180),
  approvedBudget: moneySchema,
  disbursementTarget: z.coerce.number().min(0).max(100),
  startsOn: z.string().date("กรุณาระบุวันเริ่มต้น"),
  endsOn: z.string().date("กรุณาระบุวันสิ้นสุด"),
});

export async function saveProjectAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;

  if (!isProjectPeriodValid(input.startsOn, input.endsOn)) {
    return {
      ...previous,
      success: false,
      errors: { endsOn: ["วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น"] },
      message: "ช่วงเวลาดำเนินงานไม่ถูกต้อง",
    };
  }
  if (input.intent === "submit" && input.approvedBudget <= 0) {
    return {
      ...previous,
      success: false,
      errors: { approvedBudget: ["ต้องระบุวงเงินมากกว่า 0 ก่อนส่งอนุมัติ"] },
      message: "ข้อมูลยังไม่พร้อมส่ง",
    };
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

  const { data: fiscal, error: fiscalError } = await supabase
    .from("fiscal_years")
    .select("buddhist_year")
    .eq("id", input.fiscalYearId)
    .single();
  if (fiscalError || !fiscal) return { ...previous, success: false, message: "ไม่พบปีงบประมาณที่เลือก" };

  const values = {
    organization_id: input.organizationId,
    fiscal_year_id: input.fiscalYearId,
    budget_request_id: input.budgetRequestId || null,
    owner_name: input.ownerName,
    coordinator_name: input.coordinatorName,
    title_th: input.title,
    project_type: input.projectType,
    approved_budget: input.approvedBudget,
    disbursement_target: input.disbursementTarget,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    updated_by: userId,
  };
  const mutation = input.id
    ? supabase
        .from("projects")
        .update(values)
        .eq("id", input.id)
        .eq("version", input.version)
        .eq("status", "proposed")
        .select("id,code,version")
        .maybeSingle()
    : supabase
        .from("projects")
        .insert({
          ...values,
          owner_id: userId,
          coordinator_id: userId,
          code: `PR${String(fiscal.buddhist_year).slice(-2)}${Date.now().toString().slice(-8)}`,
          status: "proposed",
          health: "normal",
          created_by: userId,
        })
        .select("id,code,version")
        .single();
  const { data, error } = await mutation;
  if (error) {
    return {
      ...previous,
      success: false,
      message: friendlyError(error),
      id: input.id || previous.id,
      version: input.version,
    };
  }
  if (!data) {
    return { ...previous, success: false, message: "รายการถูกแก้ไขโดยผู้ใช้อื่น กรุณาเปิดหน้าใหม่อีกครั้ง" };
  }

  if (input.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_entity_for_approval", {
      p_entity_type: "project",
      p_entity_id: data.id,
      p_comment: "ส่งข้อเสนอโครงการเพื่อพิจารณา",
    });
    if (submitError) {
      return {
        success: false,
        id: data.id,
        version: data.version,
        message: `บันทึก ${data.code} แล้ว แต่ส่งอนุมัติไม่สำเร็จ: ${friendlyError(submitError)}`,
      };
    }
  }

  refreshOperations();
  return {
    success: true,
    id: data.id,
    version: data.version,
    message:
      input.intent === "submit"
        ? `ส่งโครงการ ${data.code} เข้าสู่ workflow แล้ว`
        : `บันทึกฉบับร่าง ${data.code} แล้ว`,
  };
}
