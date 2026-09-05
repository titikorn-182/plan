"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordSchema } from "@/lib/auth/schemas";

export type UpdatePasswordState = { error?: string };

export async function updatePasswordAction(
  _previous: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: "ลิงก์หมดอายุ กรุณาขอลิงก์ใหม่" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่" };
  redirect("/");
}
