"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/viewer";
import { APP_ROLES, EVIDENCE_ENTITY_TYPES, isKpiDirection } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { evaluateKpiResult, isProjectPeriodValid, remainingBudget } from "@/lib/operations/rules";

export type OperationState = {
  success?: boolean;
  message?: string;
  id?: string;
  version?: number;
  errors?: Record<string, string[]>;
};

const uuidOrEmpty = z.string().uuid().optional().or(z.literal(""));
const money = z.coerce.number().finite().min(0).max(999_999_999_999);

function invalid(previous: OperationState, error: z.ZodError) {
  return { ...previous, success: false, message: "กรุณาตรวจสอบข้อมูลที่ระบุ", errors: error.flatten().fieldErrors };
}

function friendlyError(error: { code?: string; message: string }) {
  if (error.code === "42501") return "คุณไม่มีสิทธิ์ดำเนินการกับข้อมูลนี้";
  if (error.code === "23505") return "มีรายการของรอบนี้อยู่แล้ว กรุณาเปิดรายการเดิมเพื่อแก้ไข";
  if (error.code === "23514") {
    if (error.message.includes("disbursement exceeds")) return "ยอดเบิกจ่ายรวมเกินวงเงินอนุมัติของโครงการ";
    return "ข้อมูลไม่ผ่านเงื่อนไขของระบบ กรุณาตรวจสอบสถานะและค่าที่กรอก";
  }
  return error.message;
}

async function authenticated() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return { supabase, userId: null };
  return { supabase, userId };
}

function refreshOperations() {
  ["/", "/projects", "/reports/quarterly", "/disbursements", "/kpi", "/evidence", "/approvals", "/notifications", "/admin"]
    .forEach((path) => revalidatePath(path));
}

const projectSchema = z.object({
  id: uuidOrEmpty,
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  organizationId: z.string().uuid("กรุณาเลือกหน่วยงาน"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  budgetRequestId: uuidOrEmpty,
  title: z.string().trim().min(5, "ชื่อโครงการต้องมีอย่างน้อย 5 ตัวอักษร").max(300),
  projectType: z.string().trim().min(2, "กรุณาระบุประเภทโครงการ").max(120),
  ownerName: z.string().trim().min(2, "กรุณาระบุเจ้าของโครงการ").max(180),
  coordinatorName: z.string().trim().min(2, "กรุณาระบุผู้ประสานงาน").max(180),
  approvedBudget: money,
  disbursementTarget: z.coerce.number().min(0).max(100),
  startsOn: z.string().date("กรุณาระบุวันเริ่มต้น"),
  endsOn: z.string().date("กรุณาระบุวันสิ้นสุด"),
});

export async function saveProjectAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  if (!isProjectPeriodValid(input.startsOn, input.endsOn)) return { ...previous, success: false, errors: { endsOn: ["วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น"] }, message: "ช่วงเวลาดำเนินงานไม่ถูกต้อง" };
  if (input.intent === "submit" && input.approvedBudget <= 0) return { ...previous, success: false, errors: { approvedBudget: ["ต้องระบุวงเงินมากกว่า 0 ก่อนส่งอนุมัติ"] }, message: "ข้อมูลยังไม่พร้อมส่ง" };

  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: fiscal, error: fiscalError } = await supabase.from("fiscal_years").select("buddhist_year").eq("id", input.fiscalYearId).single();
  if (fiscalError || !fiscal) return { ...previous, success: false, message: "ไม่พบปีงบประมาณที่เลือก" };

  const values = {
    organization_id: input.organizationId,
    fiscal_year_id: input.fiscalYearId,
    budget_request_id: input.budgetRequestId || null,
    owner_name: input.ownerName,
    coordinator_name: input.coordinatorName,
    title_th: input.title,
    project_type: input.projectType,
    approved_budget: input.approvedBudget,
    disbursement_target: input.disbursementTarget,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    updated_by: userId,
  };
  const mutation = input.id
    ? supabase.from("projects").update(values).eq("id", input.id).eq("version", input.version).eq("status", "proposed").select("id,code,version").maybeSingle()
    : supabase.from("projects").insert({
        ...values,
        owner_id: userId,
        coordinator_id: userId,
        code: `PR${String(fiscal.buddhist_year).slice(-2)}${Date.now().toString().slice(-8)}`,
        status: "proposed",
        health: "normal",
        created_by: userId,
      }).select("id,code,version").single();
  const { data, error } = await mutation;
  if (error) return { ...previous, success: false, message: friendlyError(error), id: input.id || previous.id, version: input.version };
  if (!data) return { ...previous, success: false, message: "รายการถูกแก้ไขโดยผู้ใช้อื่น กรุณาเปิดหน้าใหม่อีกครั้ง" };

  if (input.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_entity_for_approval", { p_entity_type: "project", p_entity_id: data.id, p_comment: "ส่งข้อเสนอโครงการเพื่อพิจารณา" });
    if (submitError) return { success: false, id: data.id, version: data.version, message: `บันทึก ${data.code} แล้ว แต่ส่งอนุมัติไม่สำเร็จ: ${friendlyError(submitError)}` };
  }
  refreshOperations();
  return { success: true, id: data.id, version: data.version, message: input.intent === "submit" ? `ส่งโครงการ ${data.code} เข้าสู่ workflow แล้ว` : `บันทึกฉบับร่าง ${data.code} แล้ว` };
}

const reportSchema = z.object({
  id: uuidOrEmpty,
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  quarter: z.coerce.number().int().min(1).max(4),
  dueAt: z.string().date("กรุณาระบุกำหนดส่ง"),
  progress: z.coerce.number().int().min(0).max(100),
  summary: z.string().trim().max(5000),
  problems: z.string().trim().max(5000),
});

export async function saveQuarterlyReportAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  if (input.intent === "submit" && input.summary.length < 10) return { ...previous, success: false, errors: { summary: ["กรุณาสรุปผลอย่างน้อย 10 ตัวอักษรก่อนส่ง"] }, message: "ข้อมูลยังไม่พร้อมส่ง" };
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: project, error: projectError } = await supabase.from("projects").select("organization_id,fiscal_year_id").eq("id", input.projectId).single();
  if (projectError || !project) return { ...previous, success: false, message: "ไม่พบโครงการหรือคุณไม่มีสิทธิ์เข้าถึง" };
  if (project.fiscal_year_id !== input.fiscalYearId) return { ...previous, success: false, message: "ปีงบประมาณไม่ตรงกับโครงการ" };
  const values = {
    project_id: input.projectId,
    fiscal_year_id: input.fiscalYearId,
    organization_id: project.organization_id,
    quarter: input.quarter,
    due_at: new Date(`${input.dueAt}T23:59:59+07:00`).toISOString(),
    cumulative_progress: input.progress,
    achievement_summary: input.summary || null,
    problems: input.problems || null,
    status: "draft" as const,
    updated_by: userId,
  };
  const mutation = input.id
    ? supabase.from("quarterly_reports").update(values).eq("id", input.id).eq("version", input.version).in("status", ["draft", "revision_required"]).select("id,version").maybeSingle()
    : supabase.from("quarterly_reports").insert({ ...values, created_by: userId }).select("id,version").single();
  const { data, error } = await mutation;
  if (error) return { ...previous, success: false, message: friendlyError(error), id: input.id || previous.id, version: input.version };
  if (!data) return { ...previous, success: false, message: "รายการถูกแก้ไขหรือไม่อยู่ในสถานะที่แก้ไขได้ กรุณาเปิดหน้าใหม่" };
  if (input.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_entity_for_approval", { p_entity_type: "quarterly_report", p_entity_id: data.id, p_comment: `ส่งรายงานไตรมาส ${input.quarter}` });
    if (submitError) return { success: false, id: data.id, version: data.version, message: `บันทึกรายงานแล้ว แต่ส่งตรวจไม่สำเร็จ: ${friendlyError(submitError)}` };
  }
  refreshOperations();
  return { success: true, id: data.id, version: data.version, message: input.intent === "submit" ? "ส่งรายงานเข้าสู่ workflow แล้ว" : "บันทึกรายงานฉบับร่างแล้ว" };
}

const disbursementSchema = z.object({
  projectId: z.string().uuid("กรุณาเลือกโครงการ"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  quarter: z.coerce.number().int().min(1).max(4),
  amount: z.coerce.number().finite().positive("ยอดเบิกจ่ายต้องมากกว่า 0"),
  disbursedOn: z.string().date("กรุณาระบุวันที่เบิกจ่าย"),
  referenceNo: z.string().trim().max(120),
  status: z.enum(["recorded", "reconciled", "pending_docs", "delayed"]),
});

export async function saveDisbursementAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const parsed = disbursementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: project, error: projectError } = await supabase.from("projects").select("organization_id,fiscal_year_id,approved_budget,disbursed_amount").eq("id", input.projectId).single();
  if (projectError || !project) return { ...previous, success: false, message: "ไม่พบโครงการหรือคุณไม่มีสิทธิ์เข้าถึง" };
  if (project.fiscal_year_id !== input.fiscalYearId) return { ...previous, success: false, message: "ปีงบประมาณไม่ตรงกับโครงการ" };
  const remaining = remainingBudget(Number(project.approved_budget), Number(project.disbursed_amount));
  if (input.amount > remaining) return { ...previous, success: false, errors: { amount: [`ยอดสูงกว่าวงเงินคงเหลือ ${remaining.toLocaleString("th-TH")} บาท`] }, message: "ไม่สามารถบันทึกยอดเกินวงเงินอนุมัติ" };
  const { data, error } = await supabase.from("disbursements").insert({
    project_id: input.projectId, organization_id: project.organization_id, fiscal_year_id: input.fiscalYearId,
    quarter: input.quarter, amount: input.amount, disbursed_on: input.disbursedOn,
    reference_no: input.referenceNo || null, status: input.status, created_by: userId, updated_by: userId,
  }).select("id,version").single();
  if (error) return { ...previous, success: false, message: friendlyError(error) };
  refreshOperations();
  return { success: true, id: data.id, version: data.version, message: "บันทึกการเบิกจ่ายและปรับยอดโครงการแล้ว" };
}

const kpiSchema = z.object({
  id: z.string().uuid(),
  version: z.coerce.number().int().positive(),
  intent: z.enum(["save", "submit"]),
  actual: z.coerce.number().finite(),
  quarter: z.union([z.coerce.number().int().min(1).max(4), z.literal("")]),
  explanation: z.string().trim().max(5000),
});

export async function saveKpiResultAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const parsed = kpiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  if (input.intent === "submit" && input.explanation.length < 10) return { ...previous, success: false, errors: { explanation: ["กรุณาอธิบายผลอย่างน้อย 10 ตัวอักษรก่อนส่ง"] }, message: "ข้อมูลยังไม่พร้อมส่ง" };
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: current, error: currentError } = await supabase.from("kpi_results")
    .select("kpi_definitions!inner(target,direction)").eq("id", input.id).single();
  if (currentError || !current) return { ...previous, success: false, message: "ไม่พบตัวชี้วัดหรือคุณไม่มีสิทธิ์เข้าถึง" };
  const definition = Array.isArray(current.kpi_definitions) ? current.kpi_definitions[0] : current.kpi_definitions;
  if (!isKpiDirection(definition.direction)) return { ...previous, success: false, message: "รูปแบบการคำนวณ KPI ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ" };
  const target = Number(definition.target);
  const evaluation = evaluateKpiResult(input.actual, target, definition.direction);
  if (!evaluation.success) return { ...previous, success: false, message: evaluation.message };
  const { data, error } = await supabase.from("kpi_results").update({
    actual: input.actual, quarter: input.quarter === "" ? null : input.quarter, explanation: input.explanation || null,
    result_state: evaluation.state, status: "draft", updated_by: userId,
  }).eq("id", input.id).eq("version", input.version).in("status", ["not_started", "draft", "revision_required"]).select("id,version").maybeSingle();
  if (error) return { ...previous, success: false, message: friendlyError(error) };
  if (!data) return { ...previous, success: false, message: "ผล KPI ถูกแก้ไขหรือรับรองไปแล้ว กรุณาเปิดหน้าใหม่" };
  if (input.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_entity_for_approval", { p_entity_type: "kpi_result", p_entity_id: input.id, p_comment: "ส่งผล KPI เพื่อรับรอง" });
    if (submitError) return { success: false, id: data.id, version: data.version, message: `บันทึกผลแล้ว แต่ส่งรับรองไม่สำเร็จ: ${friendlyError(submitError)}` };
  }
  refreshOperations();
  return { success: true, id: data.id, version: data.version, message: input.intent === "submit" ? "ส่งผล KPI เพื่อรับรองแล้ว" : "บันทึกผล KPI ฉบับร่างแล้ว" };
}

const allowedMimeTypes = new Set([
  "application/pdf", "image/jpeg", "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv",
]);

export async function uploadEvidenceAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const entityId = String(formData.get("entityId") ?? "");
  const entityType = String(formData.get("entityType") ?? "");
  const organizationId = String(formData.get("organizationId") ?? "");
  const file = formData.get("file");
  if (!z.string().uuid().safeParse(entityId).success || !z.string().uuid().safeParse(organizationId).success || !EVIDENCE_ENTITY_TYPES.some((value) => value === entityType)) {
    return { ...previous, success: false, message: "กรุณาเลือกรายการที่จะผูกหลักฐาน" };
  }
  if (!(file instanceof File) || file.size === 0) return { ...previous, success: false, message: "กรุณาเลือกไฟล์หลักฐาน" };
  if (file.size > 20 * 1024 * 1024) return { ...previous, success: false, message: "ไฟล์ต้องมีขนาดไม่เกิน 20 MB" };
  if (!allowedMimeTypes.has(file.type)) return { ...previous, success: false, message: "รองรับเฉพาะ PDF, JPG, PNG, XLSX และ CSV" };
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) : "bin";
  const storagePath = `${organizationId}/${entityType}/${entityId}/${userId}/${crypto.randomUUID()}.${extension || "bin"}`;
  const { error: uploadError } = await supabase.storage.from("evidence").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return { ...previous, success: false, message: `อัปโหลดไม่สำเร็จ: ${uploadError.message}` };
  const { data, error } = await supabase.from("attachments").insert({
    organization_id: organizationId, entity_type: entityType, entity_id: entityId,
    file_name: file.name.slice(0, 255), storage_path: storagePath, mime_type: file.type,
    size_bytes: file.size, uploaded_by: userId,
  }).select("id").single();
  if (error) {
    await supabase.storage.from("evidence").remove([storagePath]);
    return { ...previous, success: false, message: `บันทึกข้อมูลไฟล์ไม่สำเร็จ: ${friendlyError(error)}` };
  }
  refreshOperations();
  return { success: true, id: data.id, message: `อัปโหลด ${file.name} แล้ว` };
}

export async function reviewEvidenceAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const schema = z.object({ id: z.string().uuid(), decision: z.enum(["verify", "return"]), comment: z.string().trim().max(1000) });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  if (parsed.data.decision === "return" && parsed.data.comment.length < 5) return { ...previous, success: false, message: "กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร" };
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ" };
  const { error } = await supabase.rpc("review_evidence", { p_attachment_id: parsed.data.id, p_verified: parsed.data.decision === "verify", p_comment: parsed.data.comment || undefined });
  if (error) return { ...previous, success: false, message: friendlyError(error) };
  refreshOperations();
  return { success: true, message: parsed.data.decision === "verify" ? "รับรองหลักฐานแล้ว" : "ส่งหลักฐานกลับแก้ไขแล้ว" };
}

export async function actOnApprovalAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const schema = z.object({ taskId: z.string().uuid(), decision: z.enum(["approved", "revision_required", "rejected"]), comment: z.string().trim().max(1000) });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  if (parsed.data.decision !== "approved" && parsed.data.comment.length < 5) return { ...previous, success: false, message: "การส่งกลับหรือไม่อนุมัติต้องระบุเหตุผลอย่างน้อย 5 ตัวอักษร" };
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ" };
  const { error } = await supabase.rpc("act_on_approval_task", { p_task_id: parsed.data.taskId, p_decision: parsed.data.decision, p_comment: parsed.data.comment || undefined });
  if (error) return { ...previous, success: false, message: friendlyError(error) };
  refreshOperations();
  return { success: true, message: parsed.data.decision === "approved" ? "อนุมัติรายการและส่งต่อ workflow แล้ว" : "บันทึกคำตัดสินและแจ้งเจ้าของรายการแล้ว" };
}

export async function markNotificationAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const id = String(formData.get("id") ?? "");
  const all = formData.get("all") === "true";
  const { supabase, userId } = await authenticated();
  if (!userId) return { ...previous, success: false, message: "เซสชันหมดอายุ" };
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", userId).is("read_at", null);
  if (!all) {
    if (!z.string().uuid().safeParse(id).success) return { ...previous, success: false, message: "ไม่พบการแจ้งเตือน" };
    query = query.eq("id", id);
  }
  const { error } = await query;
  if (error) return { ...previous, success: false, message: friendlyError(error) };
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
  return { success: true, message: all ? "อ่านการแจ้งเตือนทั้งหมดแล้ว" : "อ่านการแจ้งเตือนแล้ว" };
}

export async function updateUserAccessAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  const viewer = await requireAdmin();
  const profileId = String(formData.get("profileId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const roles = formData.getAll("roles").map(String).filter((role): role is (typeof APP_ROLES)[number] => APP_ROLES.some((value) => value === role));
  const organizationIds = formData.getAll("organizationIds").map(String).filter((id) => z.string().uuid().safeParse(id).success);
  const active = formData.get("active") === "on";
  if (!z.string().uuid().safeParse(profileId).success || fullName.length < 2 || roles.length === 0) return { ...previous, success: false, message: "กรุณาระบุชื่อและเลือกอย่างน้อย 1 บทบาท" };
  if (profileId === viewer.id && (!active || !roles.includes("admin"))) return { ...previous, success: false, message: "ไม่สามารถถอนสิทธิ์ Admin หรือระงับบัญชีของตนเอง" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_user_access", {
    p_profile_id: profileId, p_full_name: fullName, p_is_active: active,
    p_roles: roles, p_organization_ids: organizationIds,
  });
  if (error) return { ...previous, success: false, message: friendlyError(error) };
  revalidatePath("/admin");
  return { success: true, message: "บันทึกสิทธิ์ผู้ใช้งานแล้ว" };
}

export async function inviteUserAction(previous: OperationState, formData: FormData): Promise<OperationState> {
  await requireAdmin();
  const schema = z.object({
    email: z.string().trim().email("รูปแบบอีเมลไม่ถูกต้อง"),
    fullName: z.string().trim().min(2, "กรุณาระบุชื่อผู้ใช้งาน").max(180),
    role: z.enum(APP_ROLES),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const admin = createAdminClient();
  if (!admin) return { ...previous, success: false, message: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY ฝั่งเซิร์ฟเวอร์ จึงยังส่งคำเชิญไม่ได้" };
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, { data: { full_name: parsed.data.fullName }, redirectTo });
  if (error || !data.user) return { ...previous, success: false, message: error?.message ?? "สร้างผู้ใช้ไม่สำเร็จ" };
  await admin.from("profiles").upsert({ id: data.user.id, email: parsed.data.email, full_name: parsed.data.fullName, is_active: true });
  const { error: roleError } = await admin.from("user_roles").insert({ profile_id: data.user.id, role: parsed.data.role });
  if (roleError) return { ...previous, success: false, message: `ส่งคำเชิญแล้ว แต่กำหนดบทบาทไม่สำเร็จ: ${roleError.message}` };
  revalidatePath("/admin");
  return { success: true, message: `ส่งคำเชิญไปที่ ${parsed.data.email} แล้ว` };
}
