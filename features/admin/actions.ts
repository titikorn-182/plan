"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { APP_ROLES, isAppRole } from "@/features/auth/types";
import type { OperationState } from "@/features/shared/action-state";
import { friendlyError, invalid } from "@/features/shared/server-actions";
import { requireAdmin } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updateUserAccessAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const viewer = await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const roles = formData.getAll("roles").map(String).filter(isAppRole);
  const organizationIds = formData
    .getAll("organizationIds")
    .map(String)
    .filter((id) => z.string().uuid().safeParse(id).success);
  const active = formData.get("active") === "on";

  if (
    !z.string().uuid().safeParse(profileId).success ||
    fullName.length < 2 ||
    roles.length === 0
  ) {
    return { ...previous, success: false, message: "กรุณาระบุชื่อและเลือกอย่างน้อย 1 บทบาท" };
  }
  if (profileId === viewer.id && (!active || !roles.includes("admin"))) {
    return {
      ...previous,
      success: false,
      message: "ไม่สามารถถอนสิทธิ์ Admin หรือระงับบัญชีของตนเอง",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_user_access", {
    p_profile_id: profileId,
    p_full_name: fullName,
    p_is_active: active,
    p_roles: roles,
    p_organization_ids: organizationIds,
  });
  if (error) return { ...previous, success: false, message: friendlyError(error) };

  revalidatePath("/admin");
  return { success: true, message: "บันทึกสิทธิ์ผู้ใช้งานแล้ว" };
}

const invitationSchema = z.object({
  email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง"),
  fullName: z.string().trim().min(2, "กรุณาระบุชื่อผู้ใช้งาน").max(180),
  role: z.enum(APP_ROLES),
});

export async function inviteUserAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  await requireAdmin();
  const parsed = invitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);

  const admin = createAdminClient();
  if (!admin) {
    return {
      ...previous,
      success: false,
      message: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY ฝั่งเซิร์ฟเวอร์ จึงยังส่งคำเชิญไม่ได้",
    };
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.fullName },
    redirectTo,
  });
  if (error || !data.user) {
    return { ...previous, success: false, message: error?.message ?? "สร้างผู้ใช้ไม่สำเร็จ" };
  }

  await admin.from("profiles").upsert({
    id: data.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    is_active: true,
  });
  const { error: roleError } = await admin.from("user_roles").insert({
    profile_id: data.user.id,
    role: parsed.data.role,
  });
  if (roleError) {
    return {
      ...previous,
      success: false,
      message: `ส่งคำเชิญแล้ว แต่กำหนดบทบาทไม่สำเร็จ: ${roleError.message}`,
    };
  }

  revalidatePath("/admin");
  return { success: true, message: `ส่งคำเชิญไปที่ ${parsed.data.email} แล้ว` };
}
