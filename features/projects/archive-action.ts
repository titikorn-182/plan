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

const archiveSchema = z.object({ id: z.guid(), version: z.number().int().positive() });

export async function archiveProjectAction(input: {
  id: string;
  version: number;
}): Promise<OperationState> {
  const parsed = archiveSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: "ข้อมูลโครงการไม่ถูกต้อง กรุณาเปิดรายการใหม่" };
  const { supabase, userId } = await authenticated();
  if (!userId) return { success: false, message: SESSION_EXPIRED_MESSAGE };
  const viewer = await getViewer();
  if (viewer.id !== userId || !viewer.roles.includes("admin")) {
    return { success: false, message: "เฉพาะผู้ดูแลระบบเท่านั้นที่ลบโครงการได้" };
  }
  const checks = await Promise.all([
    supabase
      .from("approval_tasks")
      .select("id")
      .eq("entity_type", "project")
      .eq("entity_id", parsed.data.id)
      .eq("status", "pending")
      .limit(1),
    supabase.from("disbursements").select("id").eq("project_id", parsed.data.id).limit(1),
    supabase.from("quarterly_reports").select("id").eq("project_id", parsed.data.id).limit(1),
    supabase
      .from("project_completion_reports")
      .select("id")
      .eq("project_id", parsed.data.id)
      .limit(1),
  ]);
  const checkError = checks.find((check) => check.error)?.error;
  if (checkError)
    return { success: false, message: friendlyError(checkError, "projects.archive_links") };
  if (checks.some((check) => check.data?.length)) {
    return {
      success: false,
      message: "ลบไม่ได้: โครงการอยู่ระหว่างอนุมัติ หรือมีรายการเบิกจ่าย/รายงานอ้างอิงอยู่",
    };
  }
  // RLS also excludes projects with pending approvals. Keep the record and all links intact.
  const { data, error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", parsed.data.id)
    .eq("version", parsed.data.version)
    .eq("status", "proposed")
    .eq("disbursed_amount", 0)
    .is("archived_at", null)
    .select("id,code")
    .maybeSingle();
  if (error) return { success: false, message: friendlyError(error, "projects.archive") };
  if (!data)
    return {
      success: false,
      message: "ลบไม่ได้: โครงการถูกแก้ไข ลบ หรือเปลี่ยนสถานะแล้ว กรุณาเปิดทะเบียนใหม่",
    };
  revalidateOperationPaths(
    "/",
    "/projects",
    `/projects/${data.id}/edit`,
    "/admin",
    "/reports",
    "/budget-requests",
  );
  return {
    success: true,
    id: data.id,
    message: `ย้ายโครงการ ${data.code} ไปถังขยะแล้ว ผู้ดูแลระบบสามารถกู้คืนได้`,
  };
}
