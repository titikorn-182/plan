"use server";

import { approvalSchema } from "@/features/approvals/validation";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  revalidateOperationPaths,
  sessionExpired,
} from "@/features/shared/server-actions";

const entityPath: Readonly<Record<string, string>> = {
  budget_request: "/budget-requests",
  project: "/projects",
  quarterly_report: "/reports/quarterly",
  project_completion_report: "/reports/project-results",
  kpi_result: "/kpi",
};

export async function actOnApprovalAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const input = Object.fromEntries(formData);
  // A return/rejection must remain possible even if an unfinished amount edit is invalid.
  if (input.decision !== "approved") delete input.approvedAmount;
  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) return invalid(previous, parsed.error);
  if (parsed.data.decision !== "approved" && parsed.data.comment.length < 5) {
    return {
      ...previous,
      success: false,
      message: "การส่งกลับหรือไม่อนุมัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร",
      errors: { comment: ["กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร"] },
    };
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return sessionExpired(previous);
  const { data: task, error: taskError } = await supabase
    .from("approval_tasks")
    .select("entity_type, entity_id")
    .eq("id", parsed.data.taskId)
    .maybeSingle();
  if (taskError) {
    return {
      ...previous,
      success: false,
      message: friendlyError(taskError, "approvals.lookup"),
    };
  }
  if (!task) return { ...previous, success: false, message: "ไม่พบงานอนุมัติหรือคุณไม่มีสิทธิ์" };
  const isBudget = task.entity_type === "budget_request";
  if (isBudget && !parsed.data.expectedBudgetVersion) {
    return {
      success: false,
      message: "กรุณาเปิดรายละเอียดคำของบจากงานอนุมัติใหม่ เพื่อตรวจสอบข้อมูลล่าสุดก่อนตัดสินใจ",
    };
  }
  const { error } = await supabase.rpc("act_on_approval_task", {
    p_task_id: parsed.data.taskId,
    p_decision: parsed.data.decision,
    p_comment: parsed.data.comment || undefined,
    p_expected_budget_version: isBudget ? parsed.data.expectedBudgetVersion : undefined,
    p_approved_amount: parsed.data.approvedAmount,
  });
  if (error) {
    if (error.code === "23514" && error.message === "budget amount adjustment requires a reason") {
      return {
        success: false,
        message: "กรุณาระบุเหตุผลการเพิ่มหรือลดวงเงินอย่างน้อย 5 ตัวอักษร",
        errors: { comment: ["ระบุเหตุผลการปรับวงเงินอย่างน้อย 5 ตัวอักษร"] },
      };
    }
    if (error.code === "23514" && error.message === "approved budget amount is invalid") {
      return {
        success: false,
        message: "วงเงินไม่ถูกต้อง กรุณาระบุจำนวนตั้งแต่ 0 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง",
        errors: { approvedAmount: ["กรุณาตรวจสอบวงเงินที่พิจารณาอนุมัติ"] },
      };
    }
    return { success: false, message: friendlyError(error, "approvals.decide") };
  }

  revalidateOperationPaths(
    "/",
    "/approvals",
    ...(isBudget ? [`/budget-requests/${task.entity_id}`, "/projects/new"] : []),
    "/notifications",
    entityPath[task.entity_type] ?? "/approvals",
  );
  return {
    success: true,
    message:
      parsed.data.decision === "approved"
        ? "อนุมัติรายการและส่งต่อ workflow แล้ว"
        : "บันทึกคำตัดสินและแจ้งเจ้าของรายการแล้ว",
  };
}
