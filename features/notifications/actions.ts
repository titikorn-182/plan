"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import { authenticated, friendlyError } from "@/features/shared/server-actions";

export async function markNotificationAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const id = String(formData.get("id") ?? "");
  const all = formData.get("all") === "true";
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ" };

  let query = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (!all) {
    if (!z.string().uuid().safeParse(id).success) {
      return { ...previous, success: false, message: "ไม่พบการแจ้งเตือน" };
    }
    query = query.eq("id", id);
  }
  const { error } = await query;
  if (error) return { ...previous, success: false, message: friendlyError(error) };

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: true, message: all ? "อ่านการแจ้งเตือนทั้งหมดแล้ว" : "อ่านการแจ้งเตือนแล้ว" };
}
