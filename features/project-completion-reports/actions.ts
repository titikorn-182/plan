"use server";

import { z } from "zod";
import { projectCompletionDueDate } from "@/features/project-completion-reports/deadline";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  revalidateOperationPaths,
  uuidOrEmpty,
} from "@/features/shared/server-actions";
import { INPUT_LIMITS } from "@/lib/config/limits";

const reportSchema = z.object({
  id: uuidOrEmpty,
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  actualResults: z.string().trim().max(INPUT_LIMITS.longText),
  objectiveAchievement: z.string().trim().max(INPUT_LIMITS.longText),
  indicatorResults: z.string().trim().max(INPUT_LIMITS.longText),
  beneficiarySummary: z.string().trim().max(INPUT_LIMITS.longText),
  expenseSummary: z.string().trim().max(INPUT_LIMITS.longText),
  problems: z.string().trim().max(INPUT_LIMITS.longText),
  lessonsLearned: z.string().trim().max(INPUT_LIMITS.longText),
  followUpPlan: z.string().trim().max(INPUT_LIMITS.longText),
});

const REQUIRED_SUBMISSION_FIELDS = [
  ["actualResults", "กรุณาสรุปผลการดำเนินงานอย่างน้อย 10 ตัวอักษร"],
  ["objectiveAchievement", "กรุณาระบุผลการบรรลุวัตถุประสงค์อย่างน้อย 10 ตัวอักษร"],
  ["indicatorResults", "กรุณาระบุผลตัวชี้วัดอย่างน้อย 10 ตัวอักษร"],
  ["beneficiarySummary", "กรุณาสรุปผู้รับประโยชน์อย่างน้อย 10 ตัวอักษร"],
  ["expenseSummary", "กรุณาสรุปการใช้จ่ายงบประมาณอย่างน้อย 10 ตัวอักษร"],
] as const;

export async function saveProjectCompletionReportAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  if (input.intent === "submit") {
    const errors: Record<string, string[]> = {};
    REQUIRED_SUBMISSION_FIELDS.forEach(([field, message]) => {
      if (input[field].length < 10) errors[field] = [message];
    });
    if (Object.keys(errors).length) {
      return { ...previous, success: false, errors, message: "ข้อมูลยังไม่พร้อมส่งตรวจ" };
    }
  }

  const { supabase, userId } = await authenticated();
  if (!userId) {
    return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("organization_id,fiscal_year_id,ends_on,status")
    .eq("id", input.projectId)
    .single();
  if (projectError) {
    return {
      ...previous,
      success: false,
      message: friendlyError(projectError, "project_completion_reports.project"),
    };
  }
  if (!project?.ends_on || !["active", "on_hold", "completed"].includes(project.status)) {
    return { ...previous, success: false, message: "โครงการนี้ยังไม่พร้อมจัดทำรายงานผล" };
  }

  const values = {
    project_id: input.projectId,
    organization_id: project.organization_id,
    fiscal_year_id: project.fiscal_year_id,
    due_at: projectCompletionDueDate(project.ends_on),
    actual_results: input.actualResults || null,
    objective_achievement: input.objectiveAchievement || null,
    indicator_results: input.indicatorResults || null,
    beneficiary_summary: input.beneficiarySummary || null,
    expense_summary: input.expenseSummary || null,
    problems: input.problems || null,
    lessons_learned: input.lessonsLearned || null,
    follow_up_plan: input.followUpPlan || null,
    status: "draft" as const,
    updated_by: userId,
  };
  const mutation = input.id
    ? supabase
        .from("project_completion_reports")
        .update(values)
        .eq("id", input.id)
        .eq("version", input.version)
        .in("status", ["draft", "revision_required"])
        .select("id,version")
        .maybeSingle()
    : supabase
        .from("project_completion_reports")
        .insert({ ...values, created_by: userId })
        .select("id,version")
        .single();
  const { data, error } = await mutation;
  if (error) {
    return {
      ...previous,
      success: false,
      id: input.id || previous.id,
      version: input.version,
      message: friendlyError(error, "project_completion_reports.save"),
    };
  }
  if (!data) {
    return {
      ...previous,
      success: false,
      message: "รายงานถูกแก้ไขหรือไม่อยู่ในสถานะที่แก้ไขได้ กรุณาเปิดหน้าใหม่",
    };
  }

  if (input.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_entity_for_approval", {
      p_entity_type: "project_completion_report",
      p_entity_id: data.id,
      p_comment: "ส่งรายงานผลการดำเนินงานโครงการ",
    });
    if (submitError) {
      return {
        success: false,
        id: data.id,
        version: data.version,
        status: "draft",
        message: `บันทึกรายงานแล้ว แต่ส่งตรวจไม่สำเร็จ: ${friendlyError(submitError)}`,
      };
    }
  }

  revalidateOperationPaths(
    "/",
    "/projects",
    "/reports/project-results",
    ...(input.intent === "submit" ? ["/approvals", "/notifications"] : []),
  );
  return {
    success: true,
    id: data.id,
    version: data.version,
    status: input.intent === "submit" ? "submitted" : "draft",
    message:
      input.intent === "submit"
        ? "ส่งรายงานผลโครงการเข้าสู่ workflow แล้ว"
        : "บันทึกรายงานผลโครงการฉบับร่างแล้ว",
  };
}
