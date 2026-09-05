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

export async function reviewEvidenceAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const schema = z.object({
    id: z.string().uuid(),
    decision: z.enum(["verify", "return"]),
    comment: z.string().trim().max(INPUT_LIMITS.reviewComment),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  if (parsed.data.decision === "return" && parsed.data.comment.length < 5) {
    return { ...previous, success: false, message: "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร" };
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ" };
  const { error } = await supabase.rpc("review_evidence", {
    p_attachment_id: parsed.data.id,
    p_verified: parsed.data.decision === "verify",
    p_comment: parsed.data.comment || undefined,
  });
  if (error) return { ...previous, success: false, message: friendlyError(error) };

  revalidateOperationPaths("/", "/evidence");
  return {
    success: true,
    message: parsed.data.decision === "verify" ? "รับรองหลักฐานแล้ว" : "ส่งหลักฐานกลับแก้ไขแล้ว",
  };
}
