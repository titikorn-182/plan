"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import { authenticated, friendlyError, invalid } from "@/features/shared/server-actions";

const scheduleSchema = z
  .object({
    name: z.string().trim().min(3, "ชื่อกำหนดการต้องมีอย่างน้อย 3 ตัวอักษร").max(120),
    reportKind: z.enum(["budget", "projects", "disbursements", "kpi"]),
    format: z.enum(["xlsx", "pdf"]),
    cadence: z.enum(["weekly", "monthly", "quarterly"]),
    day: z.coerce.number().int().min(1).max(28),
    sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "กรุณาระบุเวลา"),
  })
  .superRefine((value, context) => {
    if (value.cadence === "weekly" && value.day > 7) {
      context.addIssue({
        code: "custom",
        path: ["day"],
        message: "วันประจำสัปดาห์ต้องอยู่ระหว่าง 1–7",
      });
    }
  });

export async function createReportScheduleAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = scheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const { supabase, userId } = await authenticated();
  if (!userId) return { success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const input = parsed.data;
  const { error } = await supabase.from("report_schedules").insert({
    owner_id: userId,
    name: input.name,
    report_kind: input.reportKind,
    format: input.format,
    cadence: input.cadence,
    day_of_week: input.cadence === "weekly" ? input.day : null,
    day_of_month: input.cadence === "weekly" ? null : input.day,
    send_time: input.sendTime,
  });
  if (error) return { success: false, message: friendlyError(error, "reports.schedule.create") };
  revalidatePath("/reports");
  return { success: true, message: "บันทึกกำหนดการรายงานแล้ว" };
}

export async function toggleReportScheduleAction(formData: FormData): Promise<void> {
  const parsed = z
    .object({ id: z.string().uuid(), isActive: z.enum(["true", "false"]) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { supabase, userId } = await authenticated();
  if (!userId) return;
  const { error } = await supabase
    .from("report_schedules")
    .update({ is_active: parsed.data.isActive === "true" })
    .eq("id", parsed.data.id);
  if (error) friendlyError(error, "reports.schedule.toggle");
  revalidatePath("/reports");
}

export async function deleteReportScheduleAction(formData: FormData): Promise<void> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const { supabase, userId } = await authenticated();
  if (!userId) return;
  const { error } = await supabase.from("report_schedules").delete().eq("id", id.data);
  if (error) friendlyError(error, "reports.schedule.delete");
  revalidatePath("/reports");
}
