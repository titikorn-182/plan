"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  revalidateOperationPaths,
  SESSION_EXPIRED_MESSAGE,
} from "@/features/shared/server-actions";

const revisionSchema = z
  .object({
    projectId: z.guid(),
    version: z.number().int().positive(),
    reason: z.string().trim().min(5).max(1000),
    operation: z.enum(["request", "return", "decline"]),
    requestId: z.guid().optional(),
  })
  .refine((value) => value.operation === "request" || Boolean(value.requestId));

export async function projectRevisionAction(input: {
  projectId: string;
  version: number;
  reason: string;
  operation: "request" | "return" | "decline";
  requestId?: string;
}): Promise<OperationState> {
  const parsed = revisionSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      message: "กรุณาระบุเหตุผล 5–1,000 ตัวอักษร และเปิดรายการล่าสุดก่อนดำเนินการ",
    };
  const { supabase, userId } = await authenticated();
  if (!userId) return { success: false, message: SESSION_EXPIRED_MESSAGE };
  const value = parsed.data;
  // Both RPCs authorize the actor and lock/recheck the project and request atomically.
  const { data, error } =
    value.operation === "request"
      ? await supabase.rpc("request_project_revision", {
          p_project_id: value.projectId,
          p_version: value.version,
          p_reason: value.reason,
        })
      : await supabase.rpc("decide_project_revision", {
          p_project_id: value.projectId,
          p_request_id: value.requestId!,
          p_version: value.version,
          p_return: value.operation === "return",
          p_reason: value.reason,
        });
  if (error) {
    const messages: Record<string, string> = {
      PT409: "โครงการหรือคำขอเปลี่ยนแปลงแล้ว หรือมีคำขอรออยู่ กรุณาเปิดทะเบียนใหม่",
      PT422: "ส่งกลับไม่ได้: โครงการมีรายการเบิกจ่ายหรือรายงานอ้างอิงอยู่",
      "42501":
        "คุณไม่มีสิทธิ์ดำเนินการนี้ เจ้าหน้าที่ขอแก้ไขได้เฉพาะโครงการของตนเอง และผู้ดูแลระบบเท่านั้นที่ส่งกลับได้",
    };
    return {
      success: false,
      message: messages[error.code] ?? friendlyError(error, "projects.revision"),
    };
  }
  if (!data)
    return { success: false, message: "ยังยืนยันผลไม่ได้ กรุณาเปิดทะเบียนใหม่เพื่อตรวจสอบ" };
  revalidateOperationPaths(
    "/projects",
    `/projects/${value.projectId}/edit`,
    "/approvals",
    "/notifications",
    "/",
  );
  const messages = {
    request: "ส่งคำขอแก้ไขแล้ว รอผู้ดูแลระบบพิจารณา ระหว่างนี้ยังแก้ไขโครงการไม่ได้",
    return: "ส่งกลับแก้ไขแล้ว เจ้าหน้าที่สามารถแก้ไขโครงการเดิมและส่งอนุมัติใหม่ได้",
    decline: "บันทึกผลไม่อนุญาตให้แก้ไขแล้ว โครงการยังคงสถานะเดิม",
  };
  return { success: true, id: value.projectId, message: messages[value.operation] };
}
