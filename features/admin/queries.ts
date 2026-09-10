import "server-only";

import type {
  AdminQualityData,
  AdminReferenceData,
  AdminSettings,
  AdminSummary,
  AdminUsersData,
  ArchivedRecord,
  AuditRow,
} from "@/features/admin/types";
import { isAppRole } from "@/features/auth/types";
import { createPagination, getPaginationRange } from "@/features/shared/pagination";
import { formatDate, isRecord, result } from "@/features/shared/query-utils";
import type { DataResult, OrganizationOption } from "@/features/shared/types";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

const thaiDateTime = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : thaiDateTime.format(date);
}

function changedFields(oldData: unknown, newData: unknown): string[] {
  if (!isRecord(oldData) || !isRecord(newData)) return [];
  return Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)])).filter(
    (key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]),
  );
}

export async function getAdminSummary(): Promise<DataResult<AdminSummary>> {
  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [users, inactiveUsers, organizations, audits] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("id", "in", RETIRED_DEMO_FILTERS.organizations),
    supabase
      .from("audit_events")
      .select("id", { count: "exact", head: true })
      .or(`entity_id.is.null,entity_id.not.in.${RETIRED_DEMO_FILTERS.entities}`)
      .gte("occurred_at", startOfToday.toISOString()),
  ]);
  const error = users.error ?? inactiveUsers.error ?? organizations.error ?? audits.error;
  return result(
    {
      totalUsers: users.count ?? 0,
      inactiveUsers: inactiveUsers.count ?? 0,
      activeOrganizations: organizations.count ?? 0,
      changesToday: audits.count ?? 0,
    },
    error,
    "admin.summary",
  );
}

export async function getAdminUsers(page = 1): Promise<DataResult<AdminUsersData>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.adminPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("profiles")
    .select(
      "id,full_name,email,is_active,user_roles!user_roles_profile_id_fkey(role),user_organization_scopes!user_organization_scopes_profile_id_fkey(organization_id)",
      { count: "exact" },
    )
    .order("full_name")
    .range(from, to);

  return result(
    {
      users: (data ?? []).map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        active: row.is_active,
        roles: (row.user_roles ?? []).map((role) => role.role).filter(isAppRole),
        organizationIds: (row.user_organization_scopes ?? []).map((scope) => scope.organization_id),
      })),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "admin.users",
  );
}

export async function getAdminOrganizations(): Promise<DataResult<OrganizationOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id,code,name_th")
    .eq("is_active", true)
    .not("id", "in", RETIRED_DEMO_FILTERS.organizations)
    .order("name_th");
  return result(
    (data ?? []).map((row) => ({ id: row.id, code: row.code, label: row.name_th })),
    error,
    "admin.organizations",
  );
}

export async function getAdminReferenceData(): Promise<DataResult<AdminReferenceData>> {
  const supabase = await createClient();
  const [organizations, fiscalYears, budgetCycles] = await Promise.all([
    supabase
      .from("organizations")
      .select("id,code,name_th,name_en,organization_type,parent_id,is_active")
      .not("id", "in", RETIRED_DEMO_FILTERS.organizations)
      .order("code"),
    supabase
      .from("fiscal_years")
      .select("id,buddhist_year,label,status,starts_on,ends_on")
      .order("buddhist_year", { ascending: false }),
    supabase
      .from("budget_cycles")
      .select(
        "id,fiscal_year_id,name,status,opens_at,closes_at,allow_staff_submit,fiscal_years(label)",
      )
      .not("id", "in", RETIRED_DEMO_FILTERS.budgetCycles)
      .order("opens_at", { ascending: false }),
  ]);
  const error = organizations.error ?? fiscalYears.error ?? budgetCycles.error;
  return result(
    {
      organizations: (organizations.data ?? []).map((row) => ({
        id: row.id,
        code: row.code,
        nameTh: row.name_th,
        nameEn: row.name_en ?? "",
        organizationType: row.organization_type,
        parentId: row.parent_id,
        active: row.is_active,
      })),
      fiscalYears: (fiscalYears.data ?? []).map((row) => ({
        id: row.id,
        buddhistYear: row.buddhist_year,
        label: row.label,
        status: row.status,
        startsOn: row.starts_on,
        endsOn: row.ends_on,
      })),
      budgetCycles: (budgetCycles.data ?? []).map((row) => {
        const fiscalYear = Array.isArray(row.fiscal_years) ? row.fiscal_years[0] : row.fiscal_years;
        return {
          id: row.id,
          fiscalYearId: row.fiscal_year_id,
          fiscalYearLabel: fiscalYear?.label ?? "—",
          name: row.name,
          status: row.status,
          opensAt: row.opens_at,
          closesAt: row.closes_at,
          allowStaffSubmit: row.allow_staff_submit,
        };
      }),
    },
    error,
    "admin.reference_data",
  );
}

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

export async function getAdminAudit(
  page = 1,
): Promise<DataResult<{ items: AuditRow[]; pagination: ReturnType<typeof createPagination> }>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.adminAuditPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("audit_events")
    .select(
      "id,action,entity_type,occurred_at,reason,old_data,new_data,profiles!audit_events_actor_id_fkey(email),organizations(name_th)",
      { count: "exact" },
    )
    .or(`entity_id.is.null,entity_id.not.in.${RETIRED_DEMO_FILTERS.entities}`)
    .order("occurred_at", { ascending: false })
    .range(from, to);
  return result(
    {
      items: (data ?? []).map((row) => {
        const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const organization = Array.isArray(row.organizations)
          ? row.organizations[0]
          : row.organizations;
        return {
          id: row.id,
          action: row.action,
          entityType: row.entity_type,
          createdAt: formatDateTime(row.occurred_at),
          actorEmail: actor?.email ?? "ระบบ",
          organizationName: organization?.name_th ?? "ส่วนกลาง",
          reason: row.reason,
          changedFields: changedFields(row.old_data, row.new_data),
        };
      }),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "admin.audit",
  );
}

export async function getAdminTrash(): Promise<DataResult<ArchivedRecord[]>> {
  const supabase = await createClient();
  const limit = QUERY_LIMITS.adminTrashRows;
  const [budgetRequests, projects, attachments, comments, fiscalYears] = await Promise.all([
    supabase
      .from("budget_requests")
      .select("id,code,title_th,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("projects")
      .select("id,code,title_th,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("attachments")
      .select("id,file_name,entity_type,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("comments")
      .select("id,body,entity_type,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("fiscal_years")
      .select("id,label,updated_at")
      .eq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);
  const error =
    budgetRequests.error ??
    projects.error ??
    attachments.error ??
    comments.error ??
    fiscalYears.error;
  const recordsWithSortKey: Array<ArchivedRecord & { sortKey: string }> = [
    ...(budgetRequests.data ?? []).map((row) => ({
      id: row.id,
      entityType: "budget_request" as const,
      code: row.code,
      title: row.title_th,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(projects.data ?? []).map((row) => ({
      id: row.id,
      entityType: "project" as const,
      code: row.code,
      title: row.title_th,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(attachments.data ?? []).map((row) => ({
      id: row.id,
      entityType: "attachment" as const,
      code: row.entity_type,
      title: row.file_name,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(comments.data ?? []).map((row) => ({
      id: row.id,
      entityType: "comment" as const,
      code: row.entity_type,
      title: row.body.length > 80 ? `${row.body.slice(0, 80)}…` : row.body,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(fiscalYears.data ?? []).map((row) => ({
      id: row.id,
      entityType: "fiscal_year" as const,
      code: "ปีงบประมาณ",
      title: row.label,
      archivedAt: formatDateTime(row.updated_at),
      sortKey: row.updated_at,
    })),
  ].sort((left, right) => right.sortKey.localeCompare(left.sortKey));
  const records = recordsWithSortKey.slice(0, limit).map((record) => ({
    id: record.id,
    entityType: record.entityType,
    code: record.code,
    title: record.title,
    archivedAt: record.archivedAt,
  }));
  return result(records, error, "admin.trash");
}

export async function getAdminSettings(): Promise<DataResult<AdminSettings>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select(
      "id,allowed_email_domain,default_fiscal_year_id,default_quarter,reminder_days_before,updated_at",
    )
    .limit(1)
    .maybeSingle();
  return result(
    {
      id: data?.id ?? "00000000-0000-0000-0000-000000000001",
      allowedEmailDomain: data?.allowed_email_domain ?? "ubu.ac.th",
      defaultFiscalYearId: data?.default_fiscal_year_id ?? null,
      defaultQuarter: (data?.default_quarter ?? 1) as 1 | 2 | 3 | 4,
      reminderDaysBefore: data?.reminder_days_before ?? 7,
      updatedAt: formatDate(data?.updated_at),
    },
    error,
    "admin.settings",
  );
}
