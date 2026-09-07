"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { APP_ROLES, isAppRole } from "@/features/auth/types";
import type { OperationState } from "@/features/shared/action-state";
import { friendlyError, invalid, uuidOrEmpty } from "@/features/shared/server-actions";
import { requireAdmin } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { INPUT_LIMITS } from "@/lib/config/limits";

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
  fullName: z.string().trim().min(2, "กรุณาระบุชื่อผู้ใช้งาน").max(INPUT_LIMITS.personName),
  role: z.enum(APP_ROLES),
});

export async function inviteUserAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  await requireAdmin();
  const parsed = invitationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);

  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("system_settings")
    .select("allowed_email_domain")
    .limit(1)
    .maybeSingle();
  const allowedDomain = settings?.allowed_email_domain?.toLowerCase();
  if (allowedDomain && !parsed.data.email.toLowerCase().endsWith(`@${allowedDomain}`)) {
    return {
      ...previous,
      success: false,
      message: `อนุญาตให้เชิญเฉพาะอีเมล @${allowedDomain}`,
    };
  }

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
    return {
      ...previous,
      success: false,
      message: error ? friendlyError(error, "admin.invite_user") : "สร้างผู้ใช้ไม่สำเร็จ",
    };
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    is_active: true,
  });
  if (profileError) {
    return {
      ...previous,
      success: false,
      message: `ส่งคำเชิญแล้ว แต่สร้างข้อมูลผู้ใช้ไม่สำเร็จ: ${friendlyError(
        profileError,
        "admin.create_profile",
      )}`,
    };
  }
  const { error: roleError } = await admin.from("user_roles").insert({
    profile_id: data.user.id,
    role: parsed.data.role,
  });
  if (roleError) {
    return {
      ...previous,
      success: false,
      message: `ส่งคำเชิญแล้ว แต่กำหนดบทบาทไม่สำเร็จ: ${friendlyError(
        roleError,
        "admin.assign_role",
      )}`,
    };
  }

  revalidatePath("/admin");
  return { success: true, message: `ส่งคำเชิญไปที่ ${parsed.data.email} แล้ว` };
}

const organizationSchema = z.object({
  id: uuidOrEmpty,
  code: z.string().trim().min(2).max(30),
  nameTh: z.string().trim().min(2).max(200),
  nameEn: z.string().trim().max(200).optional(),
  organizationType: z.string().trim().min(2).max(80),
  parentId: uuidOrEmpty,
});

export async function saveOrganizationAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  await requireAdmin();
  const parsed = organizationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const values = {
    code: parsed.data.code.toUpperCase(),
    name_th: parsed.data.nameTh,
    name_en: parsed.data.nameEn || null,
    organization_type: parsed.data.organizationType,
    parent_id: parsed.data.parentId || null,
    is_active: formData.get("active") === "on",
  };
  const supabase = await createClient();
  const response = parsed.data.id
    ? await supabase.from("organizations").update(values).eq("id", parsed.data.id)
    : await supabase.from("organizations").insert(values);
  if (response.error) {
    return {
      ...previous,
      success: false,
      message: friendlyError(response.error, "admin.organization"),
    };
  }
  revalidatePath("/admin");
  return { success: true, message: "บันทึกข้อมูลหน่วยงานแล้ว" };
}

const fiscalYearSchema = z.object({
  id: uuidOrEmpty,
  buddhistYear: z.coerce.number().int().min(2500).max(3000),
  label: z.string().trim().min(2).max(120),
  status: z.enum(["open", "closed", "archived"]),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
});

export async function saveFiscalYearAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  await requireAdmin();
  const parsed = fiscalYearSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  if (parsed.data.startsOn > parsed.data.endsOn) {
    return { ...previous, success: false, message: "วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น" };
  }
  const values = {
    buddhist_year: parsed.data.buddhistYear,
    label: parsed.data.label,
    status: parsed.data.status,
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
  };
  const supabase = await createClient();
  const response = parsed.data.id
    ? await supabase.from("fiscal_years").update(values).eq("id", parsed.data.id)
    : await supabase.from("fiscal_years").insert(values);
  if (response.error) {
    return {
      ...previous,
      success: false,
      message: friendlyError(response.error, "admin.fiscal_year"),
    };
  }
  revalidatePath("/admin");
  return { success: true, message: "บันทึกปีงบประมาณแล้ว" };
}

const budgetCycleSchema = z.object({
  id: uuidOrEmpty,
  fiscalYearId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
  status: z.enum(["open", "closed", "archived"]),
  opensAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  closesAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
});

function bangkokDateTimeToDate(value: string): Date {
  return new Date(`${value}:00+07:00`);
}

export async function saveBudgetCycleAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  await requireAdmin();
  const parsed = budgetCycleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const opensAt = bangkokDateTimeToDate(parsed.data.opensAt);
  const closesAt = bangkokDateTimeToDate(parsed.data.closesAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime()) || opensAt >= closesAt) {
    return { ...previous, success: false, message: "ช่วงเวลาเปิดรับคำขอไม่ถูกต้อง" };
  }
  const values = {
    fiscal_year_id: parsed.data.fiscalYearId,
    name: parsed.data.name,
    status: parsed.data.status,
    opens_at: opensAt.toISOString(),
    closes_at: closesAt.toISOString(),
    allow_staff_submit: formData.get("allowStaffSubmit") === "on",
  };
  const supabase = await createClient();
  const response = parsed.data.id
    ? await supabase.from("budget_cycles").update(values).eq("id", parsed.data.id)
    : await supabase.from("budget_cycles").insert(values);
  if (response.error) {
    return {
      ...previous,
      success: false,
      message: friendlyError(response.error, "admin.budget_cycle"),
    };
  }
  revalidatePath("/admin");
  return { success: true, message: "บันทึกรอบคำของบประมาณแล้ว" };
}

const settingsSchema = z.object({
  id: z.string().uuid(),
  allowedEmailDomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(120)
    .refine((value) => !value.includes("@"), "ระบุเฉพาะโดเมนโดยไม่ต้องใส่ @"),
  defaultFiscalYearId: uuidOrEmpty,
  defaultQuarter: z.coerce.number().int().min(1).max(4),
  reminderDaysBefore: z.coerce.number().int().min(1).max(90),
});

export async function updateSystemSettingsAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const viewer = await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("system_settings")
    .update({
      allowed_email_domain: parsed.data.allowedEmailDomain,
      default_fiscal_year_id: parsed.data.defaultFiscalYearId || null,
      default_quarter: parsed.data.defaultQuarter,
      reminder_days_before: parsed.data.reminderDaysBefore,
      updated_by: viewer.id,
    })
    .eq("id", parsed.data.id);
  if (error) {
    return { ...previous, success: false, message: friendlyError(error, "admin.settings") };
  }
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true, message: "บันทึกการตั้งค่าระบบแล้ว" };
}

const restoreSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(["budget_request", "project", "attachment", "comment", "fiscal_year"]),
});

export async function restoreArchivedRecordAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  await requireAdmin();
  const parsed = restoreSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_restore_record", {
    p_entity_type: parsed.data.entityType,
    p_entity_id: parsed.data.id,
  });
  if (error) {
    return { ...previous, success: false, message: friendlyError(error, "admin.restore") };
  }
  if (!data) return { ...previous, success: false, message: "ไม่พบรายการที่กู้คืนได้" };
  revalidatePath("/admin");
  return { success: true, message: "กู้คืนรายการแล้ว" };
}
