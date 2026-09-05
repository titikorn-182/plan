"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  refreshOperations,
  uuidOrEmpty,
} from "@/features/shared/server-actions";

const reportSchema = z.object({
  id: uuidOrEmpty,
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  quarter: z.coerce.number().int().min(1).max(4),
  dueAt: z.string().date("กรุณาระบุกำหนดส่ง"),
  progress: z.coerce.number().int().min(0).max(100),
  summary: z.string().trim().max(5000),
  problems: z.string().trim().max(5000),
});

export async function saveQuarterlyReportAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  if (input.intent === "submit" && input.summary.length < 10) {
    return {
      ...previous,
      success: false,
      errors: { summary: ["กรุณาสรุปผลอย่างน้อย 10 ตัวอักษรก่อนส่ง"] },
      message: "ข้อมูลยังไม่พร้อมส่ง",
    };
  }

  const { supabase, userId } = await authenticated();
  if (!userId)
    return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("organization_id,fiscal_year_id")
    .eq("id", input.projectId)
    .single();
  if (projectError || !project) {
    return { ...previous, success: false, message: "ไม่พบโครงการหรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  if (project.fiscal_year_id !== input.fiscalYearId) {
    return { ...previous, success: false, message: "ปีงบประมาณไม่ตรงกับโครงการ" };
  }

  const values = {
    project_id: input.projectId,
    fiscal_year_id: input.fiscalYearId,
    organization_id: project.organization_id,
    quarter: input.quarter,
    due_at: new Date(`${input.dueAt}T23:59:59+07:00`).toISOString(),
    cumulative_progress: input.progress,
    achievement_summary: input.summary || null,
    problems: input.problems || null,
    status: "draft" as const,
    updated_by: userId,
  };
  const mutation = input.id
    ? supabase
        .from("quarterly_reports")
        .update(values)
        .eq("id", input.id)
        .eq("version", input.version)
        .in("status", ["draft", "revision_required"])
        .select("id,version")
        .maybeSingle()
    : supabase
        .from("quarterly_reports")
        .insert({ ...values, created_by: userId })
        .select("id,version")
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
    return {
      ...previous,
      success: false,
      message: "รายการถูกแก้ไขหรือไม่อยู่ในสถานะที่แก้ไขได้ กรุณาเปิดหน้าใหม่",
    };
  }

  if (input.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_entity_for_approval", {
      p_entity_type: "quarterly_report",
      p_entity_id: data.id,
      p_comment: `ส่งรายงานไตรมาส ${input.quarter}`,
    });
    if (submitError) {
      return {
        success: false,
        id: data.id,
        version: data.version,
        message: `บันทึกรายงานแล้ว แต่ส่งตรวจไม่สำเร็จ: ${friendlyError(submitError)}`,
      };
    }
  }

  refreshOperations();
  return {
    success: true,
    id: data.id,
    version: data.version,
    message:
      input.intent === "submit" ? "ส่งรายงานเข้าสู่ workflow แล้ว" : "บันทึกรายงานฉบับร่างแล้ว",
  };
}
