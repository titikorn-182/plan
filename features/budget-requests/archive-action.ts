"use server";

import { z } from "zod";
import { getViewer } from "@/lib/auth/viewer";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  revalidateOperationPaths,
  SESSION_EXPIRED_MESSAGE,
} from "@/features/shared/server-actions";
import { ARCHIVABLE_BUDGET_STATUSES } from "@/features/budget-requests/register-actions";

const archiveSchema = z.object({ id: z.guid(), version: z.number().int().positive() });

export async function archiveBudgetRequestAction(input: {
  id: string;
  version: number;
}): Promise<OperationState> {
  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "ข้อมูลคำขอไม่ถูกต้อง กรุณาเปิดรายการใหม่" };

  const { supabase, userId } = await authenticated();
  if (!userId) return { success: false, message: SESSION_EXPIRED_MESSAGE };
  const viewer = await getViewer();
  if (viewer.id !== userId || !viewer.roles.includes("admin")) {
    return { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่ลบคำขอได้" };
  }

  // Keep all source links intact, including links from archived projects.
  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("budget_request_id", parsed.data.id)
    .limit(1);
  if (projectError)
    return {
      success: false,
      message: friendlyError(projectError, "budget_requests.archive_links"),
    };
  if (projects?.length) {
    return { success: false, message: "ไม่สามารถลบคำขอที่มีโครงการอ้างอิงอยู่ได้" };
  }

  // One conditional UPDATE protects against edits/submission after opening the menu.
  // Authenticated RLS and the existing audit trigger still apply. Never hard-delete.
  const { data, error } = await supabase
    .from("budget_requests")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("version", parsed.data.version)
    .in("status", ARCHIVABLE_BUDGET_STATUSES)
    .is("locked_at", null)
    .is("archived_at", null)
    .select("id,code")
    .maybeSingle();
  if (error) return { success: false, message: friendlyError(error, "budget_requests.archive") };
  if (!data) {
    return {
      success: false,
      message:
        "ลบไม่ได้: รายการถูกแก้ไข ลบ หรือเปลี่ยนสถานะแล้ว กรุณาเปิดทะเบียนใหม่ (ลบได้เฉพาะฉบับร่างหรือยกเลิกที่ไม่ถูกล็อก)",
    };
  }
  revalidateOperationPaths(
    "/",
    "/budget-requests",
    `/budget-requests/${data.id}`,
    `/budget-requests/${data.id}/edit`,
    "/admin",
  );
  return {
    success: true,
    id: data.id,
    message: `ย้ายคำขอ ${data.code} ไปถังขยะแล้ว ผู้ดูแลระบบสามารถกู้คืนได้`,
  };
}
