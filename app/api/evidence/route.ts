import { NextResponse } from "next/server";
import { z } from "zod";
import {
  EVIDENCE_BUCKET,
  EVIDENCE_MAX_FILE_SIZE_BYTES,
  EVIDENCE_MIME_TYPES,
  isExpectedEvidenceStoragePath,
} from "@/features/evidence/upload-config";
import { EVIDENCE_ENTITY_TYPES } from "@/features/evidence/types";
import {
  authenticated,
  friendlyError,
  revalidateOperationPaths,
} from "@/features/shared/server-actions";
import { isRecord } from "@/features/shared/query-utils";
import { publicFailureMessage, reportServerError } from "@/lib/observability/server-logger";
import { INPUT_LIMITS } from "@/lib/config/limits";

const registrationSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(EVIDENCE_ENTITY_TYPES),
  organizationId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(INPUT_LIMITS.fileName),
  storagePath: z.string().min(1).max(700),
  mimeType: z.enum(EVIDENCE_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(EVIDENCE_MAX_FILE_SIZE_BYTES),
});

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

async function removeUploadedObject(
  supabase: Awaited<ReturnType<typeof authenticated>>["supabase"],
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
  if (error) reportServerError("evidence.cleanup_upload", error);
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== new URL(request.url).origin) {
    return jsonError("คำขอนี้ไม่ได้มาจากระบบ", 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return jsonError("รูปแบบข้อมูลไม่ถูกต้อง", 415);
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return jsonError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);

  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) return jsonError("ข้อมูลไฟล์ไม่ถูกต้อง กรุณาอัปโหลดใหม่", 400);
    const input = parsed.data;

    if (
      !isExpectedEvidenceStoragePath(input.storagePath, {
        organizationId: input.organizationId,
        entityType: input.entityType,
        entityId: input.entityId,
        userId,
        mimeType: input.mimeType,
      })
    ) {
      return jsonError("ตำแหน่งจัดเก็บไฟล์ไม่ถูกต้อง", 400);
    }

    const pathParts = input.storagePath.split("/");
    const objectName = pathParts.at(-1) ?? "";
    const directory = pathParts.slice(0, -1).join("/");
    const { data: objects, error: storageError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .list(directory, { limit: 1, search: objectName });
    if (storageError) {
      return jsonError(friendlyError(storageError, "evidence.verify_upload"), 500);
    }
    const uploadedObject = objects.find((item) => item.name === objectName);
    if (!uploadedObject) return jsonError("ไม่พบไฟล์ที่เพิ่งอัปโหลด กรุณาลองใหม่", 404);

    const metadata = isRecord(uploadedObject.metadata) ? uploadedObject.metadata : null;
    const storedSize = metadata?.size;
    if (typeof storedSize === "number" && storedSize !== input.sizeBytes) {
      await removeUploadedObject(supabase, input.storagePath);
      return jsonError("ขนาดไฟล์ไม่ตรงกับข้อมูลที่ส่งมา กรุณาอัปโหลดใหม่", 400);
    }

    const { data, error } = await supabase
      .from("attachments")
      .insert({
        organization_id: input.organizationId,
        entity_type: input.entityType,
        entity_id: input.entityId,
        file_name: input.fileName,
        storage_path: input.storagePath,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        uploaded_by: userId,
      })
      .select("id")
      .single();
    if (error) {
      await removeUploadedObject(supabase, input.storagePath);
      return jsonError(friendlyError(error, "evidence.register_upload"), 500);
    }

    revalidateOperationPaths("/", "/evidence");
    return NextResponse.json({
      success: true,
      id: data.id,
      message: `อัปโหลด ${input.fileName} แล้ว`,
    });
  } catch (error) {
    const eventId = reportServerError("evidence.register_request", error);
    return jsonError(publicFailureMessage(eventId), 500);
  }
}
