"use server";

import { z } from "zod";
import { EVIDENCE_ENTITY_TYPES } from "@/features/evidence/types";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  refreshOperations,
} from "@/features/shared/server-actions";

const MAX_EVIDENCE_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);

export async function uploadEvidenceAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const entityId = String(formData.get("entityId") ?? "");
  const entityType = String(formData.get("entityType") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const file = formData.get("file");
  const validEntityType = EVIDENCE_ENTITY_TYPES.some((value) => value === entityType);
  if (
    !z.string().uuid().safeParse(entityId).success ||
    !z.string().uuid().safeParse(organizationId).success ||
    !validEntityType
  ) {
    return { ...previous, success: false, message: "กรุณาเลือกรายการที่จะผูกหลักฐาน" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ...previous, success: false, message: "กรุณาเลือกไฟล์หลักฐาน" };
  }
  if (file.size > MAX_EVIDENCE_FILE_SIZE) {
    return { ...previous, success: false, message: "ไฟล์ต้องมีขนาดไม่เกิน 20 MB" };
  }
  if (!ALLOWED_EVIDENCE_MIME_TYPES.has(file.type)) {
    return { ...previous, success: false, message: "รองรับเฉพาะ PDF, JPG, PNG, XLSX และ CSV" };
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const extension = file.name.includes(".")
    ? file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)
    : "bin";
  const storagePath = `${organizationId}/${entityType}/${entityId}/${userId}/${crypto.randomUUID()}.${extension || "bin"}`;
  const { error: uploadError } = await supabase.storage
    .from("evidence")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { ...previous, success: false, message: `อัปโหลดไม่สำเร็จ: ${uploadError.message}` };
  }

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      organization_id: organizationId,
      entity_type: entityType,
      entity_id: entityId,
      file_name: file.name.slice(0, 255),
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: userId,
    })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("evidence").remove([storagePath]);
    return { ...previous, success: false, message: `บันทึกข้อมูลไฟล์ไม่สำเร็จ: ${friendlyError(error)}` };
  }

  refreshOperations();
  return { success: true, id: data.id, message: `อัปโหลด ${file.name} แล้ว` };
}

export async function reviewEvidenceAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const schema = z.object({
    id: z.string().uuid(),
    decision: z.enum(["verify", "return"]),
    comment: z.string().trim().max(1000),
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

  refreshOperations();
  return {
    success: true,
    message: parsed.data.decision === "verify" ? "รับรองหลักฐานแล้ว" : "ส่งหลักฐานกลับแก้ไขแล้ว",
  };
}
