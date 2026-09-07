"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import { authenticated, friendlyError, invalid } from "@/features/shared/server-actions";
import { REPORTING_PERIOD_COOKIE } from "@/features/shared/period-preference";

const periodSchema = z.object({
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  quarter: z.coerce.number().int().min(1).max(4),
});

export async function selectReportingPeriodAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = periodSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);

  const { supabase, userId } = await authenticated();
  if (!userId) return { success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

  const { data, error } = await supabase
    .from("fiscal_years")
    .select("id")
    .eq("id", parsed.data.fiscalYearId)
    .in("status", ["open", "closed"])
    .maybeSingle();
  if (error) return { success: false, message: friendlyError(error, "reporting_period.select") };
  if (!data) return { success: false, message: "ไม่พบปีงบประมาณที่เลือก" };

  (await cookies()).set(
    REPORTING_PERIOD_COOKIE,
    `${parsed.data.fiscalYearId}:${parsed.data.quarter}`,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  );
  revalidatePath("/", "layout");
  return { success: true, message: "เปลี่ยนรอบข้อมูลแล้ว" };
}
