"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  refreshOperations,
} from "@/features/shared/server-actions";

const approvalSchema = z.object({
  taskId: z.string().uuid(),
  decision: z.enum(["approved", "revision_required", "rejected"]),
  comment: z.string().trim().max(1000),
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
  const { error } = await supabase.rpc("act_on_approval_task", {
    p_task_id: parsed.data.taskId,
    p_decision: parsed.data.decision,
    p_comment: parsed.data.comment || undefined,
  });
  if (error) return { ...previous, success: false, message: friendlyError(error) };

  refreshOperations();
  return {
    success: true,
    message:
      parsed.data.decision === "approved"
        ? "อนุมัติรายการและส่งต่อ workflow แล้ว"
        : "บันทึกคำตัดสินและแจ้งเจ้าของรายการแล้ว",
  };
}
