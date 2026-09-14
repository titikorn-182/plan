import "server-only";

import type { AdminQualityData } from "@/features/admin/types";
import { formatDateTime } from "../query-formatters";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";

export async function getAdminQualityData(): Promise<DataResult<AdminQualityData>> {
  const supabase = await createClient();
  const [accessQuality, projects, reports, kpis, disbursements, evidence] = await Promise.all([
    supabase.rpc("admin_user_access_quality").maybeSingle(),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .or("owner_id.is.null,coordinator_id.is.null"),
    supabase
      .from("quarterly_reports")
      .select("id", { count: "exact", head: true })
      .lt("due_at", new Date().toISOString())
      .in("status", ["draft", "revision_required", "overdue"]),
    supabase
      .from("kpi_results")
      .select("id", { count: "exact", head: true })
      .is("actual", null)
      .neq("status", "not_applicable"),
    supabase
      .from("disbursements")
      .select("id", { count: "exact", head: true })
      .is("reference_no", null),
    supabase
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null)
      .eq("is_verified", false),
  ]);
  const error =
    accessQuality.error ??
    projects.error ??
    reports.error ??
    kpis.error ??
    disbursements.error ??
    evidence.error;
  const withoutRoles = accessQuality.data?.users_without_roles ?? 0;
  const withoutScopes = accessQuality.data?.users_without_scopes ?? 0;
  const issueDefinitions = [
    {
      id: "users-without-role",
      title: "ผู้ใช้งานยังไม่มีบทบาท",
      detail: "บัญชีที่ไม่มีบทบาทจะเข้าใช้โมดูลตามหน้าที่ไม่ได้",
      count: withoutRoles,
      severity: "critical" as const,
      href: "/admin?section=users",
      actionLabel: "จัดการสิทธิ์",
    },
    {
      id: "users-without-scope",
      title: "ผู้ใช้งานยังไม่มีขอบเขตหน่วยงาน",
      detail: "ตรวจสอบหน่วยงานที่ผู้ใช้งานควรเห็นและบันทึกข้อมูล",
      count: withoutScopes,
      severity: "warning" as const,
      href: "/admin?section=users",
      actionLabel: "กำหนดขอบเขต",
    },
    {
      id: "projects-without-owner",
      title: "โครงการขาดผู้รับผิดชอบ",
      detail: "โครงการที่ไม่มีเจ้าของหรือผู้ประสานงานทำให้ติดตามงานต่อไม่ได้",
      count: projects.count ?? 0,
      severity: "critical" as const,
      href: "/projects",
      actionLabel: "ตรวจสอบโครงการ",
    },
    {
      id: "overdue-quarterly-reports",
      title: "รายงานรายไตรมาสเลยกำหนด",
      detail: "รายงานที่ถึงกำหนดแล้วแต่ยังไม่ส่งหรืออยู่ระหว่างแก้ไข",
      count: reports.count ?? 0,
      severity: "warning" as const,
      href: "/reports/quarterly",
      actionLabel: "ติดตามรายงาน",
    },
    {
      id: "kpi-without-actual",
      title: "ผล KPI ยังไม่มีค่าจริง",
      detail: "รายการ KPI ที่ต้องกรอกผลก่อนเข้าสู่การรับรอง",
      count: kpis.count ?? 0,
      severity: "review" as const,
      href: "/kpi",
      actionLabel: "ตรวจสอบ KPI",
    },
    {
      id: "disbursements-without-reference",
      title: "รายการเบิกจ่ายไม่มีเลขอ้างอิง",
      detail: "รายการที่ควรเติมเลขเอกสารเพื่อให้ตรวจสอบย้อนหลังได้",
      count: disbursements.count ?? 0,
      severity: "warning" as const,
      href: "/disbursements",
      actionLabel: "ตรวจสอบเบิกจ่าย",
    },
    {
      id: "unverified-evidence",
      title: "หลักฐานรอการตรวจสอบ",
      detail: "ไฟล์ที่อัปโหลดแล้วแต่ยังไม่ได้รับรองความถูกต้อง",
      count: evidence.count ?? 0,
      severity: "review" as const,
      href: "/evidence",
      actionLabel: "ตรวจหลักฐาน",
    },
  ];

  return result(
    {
      issues: issueDefinitions,
      checkedAt: formatDateTime(new Date().toISOString()),
      passedChecks: issueDefinitions.filter((item) => item.count === 0).length,
    },
    error,
    "admin.data_quality",
  );
}
