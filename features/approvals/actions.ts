"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  revalidateOperationPaths,
} from "@/features/shared/server-actions";
import { INPUT_LIMITS } from "@/lib/config/limits";

const entityPath: Readonly<Record<string, string>> = {
  budget_request: "/budget-requests",
  project: "/projects",
  quarterly_report: "/reports/quarterly",
  kpi_result: "/kpi",
};

const approvalSchema = z.object({
  taskId: z.string().uuid(),
  decision: z.enum(["approved", "revision_required", "rejected"]),
  comment: z.string().trim().max(INPUT_LIMITS.reviewComment),
});

export async function actOnApprovalAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = approvalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  if (parsed.data.decision !== "approved" && parsed.data.comment.length < 5) {
    return {
      ...previous,
      success: false,
      message: "การส่งกลับหรือไม่อนุมัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร",
    };
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ" };
  const { data: task, error: taskError } = await supabase
    .from("approval_tasks")
    .select("entity_type")
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
  const { error } = await supabase.rpc("act_on_approval_task", {
    p_task_id: parsed.data.taskId,
    p_decision: parsed.data.decision,
    p_comment: parsed.data.comment || undefined,
  });
  if (error) return { ...previous, success: false, message: friendlyError(error) };

  revalidateOperationPaths(
    "/",
    "/approvals",
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
