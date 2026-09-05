"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/auth/schemas";

export type ResetState = { message?: string; error?: string };

export async function requestPasswordReset(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) return { error: "ไม่สามารถส่งอีเมลได้ในขณะนี้ กรุณาลองใหม่ภายหลัง" };
  return { message: "หากอีเมลนี้มีอยู่ในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว" };
}
