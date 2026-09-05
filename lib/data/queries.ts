import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import {
  calculateKpiAttainmentPercent,
  COMMAND_CENTER_THRESHOLDS,
  getQuarterProgressTarget,
} from "@/lib/operations/rules";
import {
  isAppRole,
  isDecisionStage,
  isEvidenceEntityType,
  isKpiDirection,
  isKpiFramework,
  isKpiResultStatus,
  isWorkflowStatus,
} from "@/lib/domain";
import type {
  AdminUser,
  AuditRow,
  BudgetFormOptions,
  BudgetRequest,
  CommandCenterRow,
  DataResult,
  DecisionRecord,
  DisbursementFormOptions,
  DisbursementRow,
  EvidenceEntityOption,
  EvidenceRow,
  FiscalYearOption,
  KpiRow,
  KpiResultFormRecord,
  KpiDirection,
  KpiResultState,
  LifecycleItem,
  NotificationRow,
  OrganizationOption,
  ProjectFormOptions,
  ProjectRow,
  ProjectOption,
  QuarterlyReportFormOptions,
  QuarterlyReportRow,
  ReportingPeriod,
  Severity,
  WorkflowTask,
  WorkState,
} from "@/lib/domain";

const thaiDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", { day: "numeric", month: "short", year: "numeric" });
const money = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : thaiDate.format(date);
}

function result<T>(data: T, error?: { message: string } | null): DataResult<T> {
  return { data, error: error?.message ?? null };
}

function hasValues<T extends object, K extends keyof T>(row: T, keys: readonly K[]): row is T & { [P in K]-?: NonNullable<T[P]> } {
  return keys.every((key) => row[key] !== null && row[key] !== undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toQuarter(value: number): ReportingPeriod["quarter"] {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}

function fallbackReportingPeriod(now = new Date()): ReportingPeriod {
  const month = now.getMonth();
  const quarter: ReportingPeriod["quarter"] = month >= 9 ? 1 : month <= 2 ? 2 : month <= 5 ? 3 : 4;
  const buddhistYear = now.getFullYear() + (month >= 9 ? 544 : 543);
  return {
    fiscalYearId: null,
    fiscalYearLabel: `ปีงบประมาณ ${buddhistYear}`,
    buddhistYear,
    quarter,
    quarterLabel: `ไตรมาส ${quarter}`,
  };
}

function quarterForDate(startsOn: string, endsOn: string, now = new Date()): ReportingPeriod["quarter"] {
  const start = new Date(`${startsOn}T00:00:00+07:00`);
  const end = new Date(`${endsOn}T23:59:59+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return fallbackReportingPeriod(now).quarter;
  if (now <= start) return 1;
  if (now >= end) return 4;
  const monthDifference = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  return toQuarter(Math.floor(monthDifference / 3) + 1);
}

export const getReportingPeriod = cache(async (): Promise<ReportingPeriod> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fiscal_years")
    .select("id,buddhist_year,label,starts_on,ends_on,status")
    .in("status", ["open", "closed"])
    .order("buddhist_year", { ascending: false });
  if (error || !data?.length) return fallbackReportingPeriod();
  const today = new Date();
  const todayKey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(today);
  const active = data.find((item) => item.starts_on <= todayKey && item.ends_on >= todayKey)
    ?? data.find((item) => item.status === "open")
    ?? data[0];
  const quarter = quarterForDate(active.starts_on, active.ends_on, today);
  return {
    fiscalYearId: active.id,
    fiscalYearLabel: active.label,
    buddhistYear: active.buddhist_year,
    quarter,
    quarterLabel: `ไตรมาส ${quarter}`,
  };
});

const budgetStatus: Record<string, BudgetRequest["status"]> = {
  draft: "ฉบับร่าง", submitted: "รอตรวจสอบ", under_review: "รอตรวจสอบ", pending_approval: "รออนุมัติ",
  revision_required: "ส่งกลับแก้ไข", approved: "อนุมัติแล้ว", rejected: "ส่งกลับแก้ไข", withdrawn: "ยกเลิก", cancelled: "ยกเลิก",
};
const projectHealth: Record<string, ProjectRow["health"]> = { normal: "ปกติ", watch: "เฝ้าระวัง", at_risk: "เสี่ยงสูง", delayed: "ล่าช้า" };
const reportStatus: Record<string, QuarterlyReportRow["status"]> = {
  draft: "ฉบับร่าง", submitted: "รอตรวจ", under_review: "รอตรวจ", revision_required: "ต้องแก้ไข", approved: "อนุมัติแล้ว", overdue: "เกินกำหนด",
};
const disbursementStatus: Record<string, DisbursementRow["status"]> = { recorded: "ตามแผน", reconciled: "ตามแผน", pending_docs: "รอเอกสาร", delayed: "เบิกจ่ายล่าช้า" };
const kpiStatus: Record<string, KpiRow["status"]> = { achieved: "บรรลุ", on_track: "เฝ้าระวัง", at_risk: "ต่ำกว่าเป้า", not_achieved: "ต่ำกว่าเป้า", no_data: "ไม่มีข้อมูล" };
const decisionState: Record<string, WorkState> = {
  draft: "ข้อมูลไม่ครบ", submitted: "รอพิจารณา", under_review: "รอพิจารณา", pending_approval: "รออนุมัติ",
  revision_required: "ข้อมูลไม่ครบ", proposed: "รออนุมัติ", active: "รอรายงาน", on_hold: "เสี่ยงสูง",
  normal: "รอรายงาน", watch: "รอรายงาน", at_risk: "เสี่ยงสูง", delayed: "ล่าช้า",
  pending_docs: "รอเอกสาร", submitted_kpi: "รอรับรอง", overdue: "ข้อมูลไม่ครบ", no_data: "ข้อมูลไม่ครบ", not_achieved: "หลักฐานไม่ครบ",
};
const severityMap: Record<string, Severity> = { medium: "ปานกลาง", high: "สูง", critical: "สูงมาก" };

export async function getBudgetRequests(): Promise<DataResult<BudgetRequest[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("budget_request_register").select("*").order("updated_at", { ascending: false });
  return result((data ?? []).filter((row) => hasValues(row, ["id", "code", "title", "unit", "category", "status"])).map((row) => ({
    uuid: row.id, id: row.code, title: row.title, unit: row.unit, category: row.category,
    amount: Number(row.amount), status: budgetStatus[row.status] ?? "ฉบับร่าง", updated: formatDate(row.updated_at),
    editable: ["draft", "revision_required"].includes(row.status),
  })), error);
}

export async function getProjects(): Promise<DataResult<ProjectRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_register").select("*").order("updated_at", { ascending: false });
  return result((data ?? []).filter((row) => hasValues(row, ["id", "code", "title", "unit", "health", "owner", "status"])).map((row) => ({
    uuid: row.id, id: row.code, title: row.title, unit: row.unit, budget: Number(row.budget), spent: Number(row.spent),
    progress: Number(row.progress), health: projectHealth[row.health] ?? "เฝ้าระวัง", owner: row.owner, due: formatDate(row.due),
    editable: row.status === "proposed" && !row.has_pending_approval,
  })), error);
}

export async function getQuarterlyReports(): Promise<DataResult<QuarterlyReportRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("quarterly_report_register").select("*").order("due_at", { ascending: true });
  return result((data ?? []).filter((row) => hasValues(row, ["id", "project", "title", "unit", "quarter", "buddhist_year", "status"])).map((row) => ({
    uuid: row.id, project: row.project, title: row.title, unit: row.unit, quarter: `Q${row.quarter}/${row.buddhist_year}`,
    due: formatDate(row.due_at), status: reportStatus[row.status] ?? "ฉบับร่าง", progress: Number(row.progress), evidence: Number(row.evidence),
  })), error);
}

export async function getDisbursements(): Promise<DataResult<DisbursementRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("disbursement_register").select("*").order("id", { ascending: true });
  return result((data ?? []).filter((row) => hasValues(row, ["project_id", "id", "project", "unit", "status"])).map((row) => ({
    uuid: row.project_id, id: row.id, project: row.project, unit: row.unit, approved: Number(row.approved),
    q1: Number(row.q1), q2: Number(row.q2), q3: Number(row.q3), q4: Number(row.q4), target: Number(row.target),
    status: disbursementStatus[row.status] ?? "เฝ้าระวัง",
  })), error);
}

export async function getKpis(): Promise<DataResult<KpiRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("kpi_register").select("*").order("code", { ascending: true });
  return result((data ?? []).filter((row) => hasValues(row, ["id", "code", "name", "owner", "framework", "unit", "status"])).map((row) => ({
    uuid: row.id, code: row.code, name: row.name, owner: row.owner, framework: isKpiFramework(row.framework) ? row.framework : "Internal",
    target: Number(row.target), actual: row.actual === null ? null : Number(row.actual), unit: row.unit,
    status: kpiStatus[row.status] ?? "ไม่มีข้อมูล", workflowStatus: isKpiResultStatus(row.workflow_status) ? row.workflow_status : "not_started",
  })), error);
}

export async function getDashboardData(): Promise<DataResult<{ records: DecisionRecord[]; lifecycle: LifecycleItem[]; matrix: CommandCenterRow[] }>> {
  const [supabase, reportingPeriod] = await Promise.all([createClient(), getReportingPeriod()]);
  const progressTarget = getQuarterProgressTarget(reportingPeriod.quarter);
  const [queue, organizations, budgets, projects, disbursements, kpis, attachments] = await Promise.all([
    supabase.from("decision_queue").select("*").order("sort_key", { ascending: false }).limit(50),
    supabase.from("organizations").select("id,code,name_th").eq("is_active", true).order("name_th"),
    supabase.from("budget_request_register").select("organization_id,unit,amount"),
    supabase.from("project_register").select("organization_id,unit,budget,progress"),
    supabase.from("disbursement_register").select("organization_id,unit,approved,q1,q2,q3,q4,target"),
    supabase.from("kpi_results").select("id,organization_id,actual,result_state,evidence_count,kpi_definitions!inner(owner_name,target,direction)"),
    supabase.from("attachments").select("organization_id,is_verified").is("archived_at", null),
  ]);
  const dashboardError = queue.error ?? organizations.error ?? budgets.error ?? projects.error ?? disbursements.error ?? kpis.error ?? attachments.error;
  if (dashboardError) return result({ records: [], lifecycle: [], matrix: [] }, dashboardError);

  type DashboardKpi = {
    id: string;
    organizationId: string;
    owner: string;
    target: number;
    actual: number | null;
    direction: KpiDirection;
    resultState: KpiResultState;
  };
  const dashboardKpis = (kpis.data ?? []).flatMap((row): DashboardKpi[] => {
    const definition = Array.isArray(row.kpi_definitions) ? row.kpi_definitions[0] : row.kpi_definitions;
    if (!definition || !isKpiDirection(definition.direction)) return [];
    return [{
      id: row.id,
      organizationId: row.organization_id,
      owner: definition.owner_name,
      target: Number(definition.target),
      actual: row.actual === null ? null : Number(row.actual),
      direction: definition.direction,
      resultState: row.result_state,
    }];
  });
  const dashboardKpiById = new Map(dashboardKpis.map((item) => [item.id, item]));

  const records: DecisionRecord[] = (queue.data ?? [])
    .filter((row) => hasValues(row, ["entity_id", "business_id", "title", "unit", "stage", "raw_state", "severity", "owner", "coordinator", "buddhist_year", "project_type", "progress"]))
    .filter((row): row is typeof row & { stage: DecisionRecord["stage"] } => isDecisionStage(row.stage))
    .map((row) => {
    const evidence = Array.isArray(row.evidence) ? row.evidence : [];
    const stateKey = row.raw_state === "submitted" && row.entity_type === "kpi_result" ? "submitted_kpi" : row.raw_state;
    const kpi = row.stage === "KPI" ? dashboardKpiById.get(row.entity_id) : undefined;
    const kpiProgress = kpi ? calculateKpiAttainmentPercent(kpi.actual, kpi.target, kpi.direction) : null;
    return {
      uuid: row.entity_id, id: row.business_id, title: row.title, unit: row.unit, stage: row.stage,
      state: decisionState[stateKey] ?? "รอพิจารณา",
      amount: row.amount_value === null ? (row.amount_note ?? "—") : money.format(Number(row.amount_value)),
      severity: severityMap[row.severity] ?? "ปานกลาง", owner: row.owner, coordinator: row.coordinator,
      fiscalYear: String(row.buddhist_year), projectType: row.project_type, progress: kpiProgress ?? Number(row.progress),
      evidence: evidence.flatMap((item) => isRecord(item) ? [{
        name: typeof item.name === "string" ? item.name : "เอกสารแนบ",
        date: typeof item.date === "string" ? formatDate(item.date) : "—",
        verified: item.verified === true,
      }] : []),
    };
  });

  const counts = records.reduce<Record<DecisionRecord["stage"], number>>((acc, row) => {
    acc[row.stage] += 1;
    return acc;
  }, { "คำของบ": 0, "โครงการ": 0, "ดำเนินงาน": 0, "เบิกจ่าย": 0, KPI: 0 });
  const lifecycle: LifecycleItem[] = (["คำของบ", "โครงการ", "ดำเนินงาน", "เบิกจ่าย", "KPI"] as const).map((label) => ({
    label, count: new Intl.NumberFormat("th-TH").format(counts[label]), helper: label === "KPI" ? "ตัวชี้วัด" : label === "โครงการ" || label === "ดำเนินงาน" ? "โครงการ" : "รายการ",
  }));

  type Aggregate = CommandCenterRow & { progressTotal: number; disbursedAmount: number; targetTotal: number; kpiRatioTotal: number };
  const byOrganization = new Map<string, Aggregate>();
  const ensure = (id: string, unit: string, code = "ORG") => {
    const current = byOrganization.get(id);
    if (current) return current;
    const created: Aggregate = {
      id, code, unit, requested: 0, approved: 0, progress: 0, disbursement: 0, disbursementTarget: 0,
      kpiScore: null, kpiMet: 0, kpiTotal: 0, evidenceVerified: 0, evidenceTotal: 0, projectCount: 0,
      status: "noData", progressTotal: 0, disbursedAmount: 0, targetTotal: 0, kpiRatioTotal: 0,
    };
    byOrganization.set(id, created);
    return created;
  };

  (organizations.data ?? []).forEach((row) => ensure(row.id, row.name_th, row.code));
  (budgets.data ?? []).filter((row) => hasValues(row, ["organization_id", "unit"])).forEach((row) => {
    const aggregate = ensure(row.organization_id, row.unit);
    aggregate.requested += Number(row.amount);
  });
  (projects.data ?? []).filter((row) => hasValues(row, ["organization_id", "unit"])).forEach((row) => {
    const aggregate = ensure(row.organization_id, row.unit);
    aggregate.approved += Number(row.budget);
    aggregate.progressTotal += Number(row.progress);
    aggregate.projectCount += 1;
  });
  (disbursements.data ?? []).filter((row) => hasValues(row, ["organization_id", "unit"])).forEach((row) => {
    const aggregate = ensure(row.organization_id, row.unit);
    aggregate.disbursedAmount += Number(row.q1) + Number(row.q2) + Number(row.q3) + Number(row.q4);
    aggregate.targetTotal += Number(row.target);
  });
  dashboardKpis.forEach((row) => {
    const aggregate = ensure(row.organizationId, row.owner);
    const ratio = calculateKpiAttainmentPercent(row.actual, row.target, row.direction);
    if (ratio !== null) {
      aggregate.kpiRatioTotal += ratio;
      if (row.resultState === "achieved") aggregate.kpiMet += 1;
    }
    aggregate.kpiTotal += 1;
  });
  (attachments.data ?? []).forEach((row) => {
    const aggregate = byOrganization.get(row.organization_id);
    if (!aggregate) return;
    aggregate.evidenceTotal += 1;
    if (row.is_verified) aggregate.evidenceVerified += 1;
  });

  const matrix = Array.from(byOrganization.values())
    .filter((row) => row.requested > 0 || row.approved > 0 || row.kpiTotal > 0 || row.evidenceTotal > 0)
    .map<CommandCenterRow>((row) => {
      const progress = row.projectCount > 0 ? row.progressTotal / row.projectCount : 0;
      const disbursement = row.approved > 0 ? (row.disbursedAmount / row.approved) * 100 : 0;
      const disbursementTarget = row.projectCount > 0 ? row.targetTotal / row.projectCount : 0;
      const kpiScore = row.kpiTotal > 0 ? row.kpiRatioTotal / row.kpiTotal : null;
      const hasDeliveryData = row.projectCount > 0;
      const status: CommandCenterRow["status"] = !hasDeliveryData && kpiScore === null
        ? "noData"
        : progress < Math.max(0, progressTarget - COMMAND_CENTER_THRESHOLDS.riskGap)
            || (hasDeliveryData && disbursement < Math.max(0, disbursementTarget - COMMAND_CENTER_THRESHOLDS.riskGap))
            || (kpiScore !== null && kpiScore < COMMAND_CENTER_THRESHOLDS.kpiRisk)
          ? "risk"
          : progress >= progressTarget + COMMAND_CENTER_THRESHOLDS.aheadGap
              && disbursement >= disbursementTarget
              && (kpiScore === null || kpiScore >= COMMAND_CENTER_THRESHOLDS.kpiAhead)
            ? "ahead"
            : progress >= progressTarget
                && disbursement >= Math.max(0, disbursementTarget - COMMAND_CENTER_THRESHOLDS.watchGap)
                && (kpiScore === null || kpiScore >= COMMAND_CENTER_THRESHOLDS.kpiOnTrack)
              ? "onTrack"
              : "watch";
      return {
        id: row.id, code: row.code, unit: row.unit, requested: row.requested, approved: row.approved,
        progress, disbursement, disbursementTarget, kpiScore, kpiMet: row.kpiMet, kpiTotal: row.kpiTotal,
        evidenceVerified: row.evidenceVerified, evidenceTotal: row.evidenceTotal, projectCount: row.projectCount, status,
      };
    })
    .sort((a, b) => b.approved - a.approved || b.requested - a.requested || a.unit.localeCompare(b.unit, "th"));

  return result({ records, lifecycle, matrix });
}

export async function getBudgetFormOptions(budgetRequestId?: string): Promise<DataResult<BudgetFormOptions | null>> {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const currentTimestamp = new Date().toISOString();
  const [{ data: organizations, error: orgError }, { data: cycles, error: cycleError }, recordResult] = await Promise.all([
    supabase.from("organizations").select("id,name_th").eq("is_active", true).order("name_th"),
    supabase.from("budget_cycles").select("id,fiscal_year_id,fiscal_years!inner(label,status)").eq("status", "open").lte("opens_at", currentTimestamp).gte("closes_at", currentTimestamp).order("closes_at").limit(1),
    budgetRequestId
      ? supabase.from("budget_requests")
        .select("id,code,version,title_th,organization_id,project_type,owner_name,rationale,requested_amount,status,fiscal_year_id,budget_cycle_id,fiscal_years!budget_requests_fiscal_year_id_fkey(label),organizations!budget_requests_organization_id_fkey(name_th)")
        .eq("id", budgetRequestId)
        .is("archived_at", null)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const error = orgError ?? cycleError ?? recordResult.error;
  if (error) return result(null, error);
  if (budgetRequestId && !recordResult.data) return result(null, { message: "ไม่พบคำของบประมาณหรือคุณไม่มีสิทธิ์เข้าถึง" });
  const cycle = cycles?.[0];
  const recordRow = recordResult.data;
  if (!recordRow && !cycle) return result(null, { message: "ยังไม่มีรอบรับคำของบประมาณที่เปิดใช้งาน" });
  const cycleFiscal = cycle ? (Array.isArray(cycle.fiscal_years) ? cycle.fiscal_years[0] : cycle.fiscal_years) : null;
  const recordFiscal = recordRow ? (Array.isArray(recordRow.fiscal_years) ? recordRow.fiscal_years[0] : recordRow.fiscal_years) : null;
  const recordOrganization = recordRow ? (Array.isArray(recordRow.organizations) ? recordRow.organizations[0] : recordRow.organizations) : null;
  const organizationOptions = (organizations ?? []).map((item) => ({ id: item.id, name: item.name_th }));
  if (recordRow && recordOrganization && !organizationOptions.some((item) => item.id === recordRow.organization_id)) {
    organizationOptions.push({ id: recordRow.organization_id, name: `${recordOrganization.name_th} (ปิดใช้งาน)` });
  }
  return result({
    organizations: organizationOptions,
    fiscalYearId: recordRow?.fiscal_year_id ?? cycle!.fiscal_year_id,
    fiscalYearLabel: recordFiscal?.label ?? cycleFiscal?.label ?? "—",
    budgetCycleId: recordRow?.budget_cycle_id ?? cycle!.id,
    defaultOwnerName: viewer.fullName,
    record: recordRow ? {
      id: recordRow.id,
      code: recordRow.code,
      version: recordRow.version,
      title: recordRow.title_th,
      organizationId: recordRow.organization_id,
      projectType: recordRow.project_type,
      ownerName: recordRow.owner_name,
      rationale: recordRow.rationale,
      amount: Number(recordRow.requested_amount),
      status: recordRow.status,
    } : null,
  });
}

export async function getAdminData(): Promise<DataResult<{ users: AdminUser[]; audits: AuditRow[]; organizationCount: number }>> {
  const supabase = await createClient();
  const [profiles, audits, organizations] = await Promise.all([
    supabase.from("profiles").select("id,full_name,email,is_active,user_roles!user_roles_profile_id_fkey(role),user_organization_scopes!user_organization_scopes_profile_id_fkey(organization_id)").order("full_name").limit(100),
    supabase.from("audit_events").select("id,action,entity_type,occurred_at,profiles!audit_events_actor_id_fkey(email)").order("occurred_at", { ascending: false }).limit(8),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);
  const error = profiles.error ?? audits.error ?? organizations.error;
  return result({
    users: (profiles.data ?? []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      active: row.is_active,
      roles: (row.user_roles ?? []).map((role) => role.role),
      organizationIds: (row.user_organization_scopes ?? []).map((scope) => scope.organization_id),
    })),
    audits: (audits.data ?? []).map((row) => {
      const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return { id: row.id, action: row.action, entityType: row.entity_type, createdAt: formatDate(row.occurred_at), actorEmail: actor?.email ?? "ระบบ" };
    }),
    organizationCount: organizations.count ?? 0,
  }, error);
}

async function getOrganizationsAndYears() {
  const supabase = await createClient();
  const [organizations, fiscalYears] = await Promise.all([
    supabase.from("organizations").select("id,code,name_th").eq("is_active", true).order("name_th"),
    supabase.from("fiscal_years").select("id,buddhist_year,label").in("status", ["open", "closed"]).order("buddhist_year", { ascending: false }),
  ]);
  return {
    organizations: (organizations.data ?? []).map<OrganizationOption>((row) => ({ id: row.id, code: row.code, label: row.name_th })),
    fiscalYears: (fiscalYears.data ?? []).map<FiscalYearOption>((row) => ({ id: row.id, buddhistYear: row.buddhist_year, label: row.label })),
    error: organizations.error ?? fiscalYears.error,
  };
}

export async function getProjectFormOptions(projectId?: string): Promise<DataResult<ProjectFormOptions | null>> {
  const [viewer, supabase, common] = await Promise.all([getViewer(), createClient(), getOrganizationsAndYears()]);
  const [budgets, recordResult] = await Promise.all([
    supabase.from("budget_requests").select("id,code,title_th").eq("status", "approved").is("archived_at", null).order("code"),
    projectId
      ? supabase.from("projects").select("id,version,code,organization_id,fiscal_year_id,budget_request_id,title_th,project_type,owner_name,coordinator_name,approved_budget,disbursement_target,starts_on,ends_on,status").eq("id", projectId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const error = common.error ?? budgets.error ?? recordResult.error;
  if (error) return result(null, error);
  const row = recordResult.data;
  const pendingApproval = row
    ? await supabase.from("approval_tasks").select("id", { count: "exact", head: true }).eq("entity_type", "project").eq("entity_id", row.id).eq("status", "pending")
    : { count: 0, error: null };
  if (pendingApproval.error) return result(null, pendingApproval.error);
  return result({
    organizations: common.organizations,
    fiscalYears: common.fiscalYears,
    budgetRequests: (budgets.data ?? []).map((item) => ({ id: item.id, label: `${item.code} · ${item.title_th}` })),
    defaultOwnerName: viewer.fullName,
    record: row ? {
      id: row.id, version: row.version, code: row.code, organizationId: row.organization_id,
      fiscalYearId: row.fiscal_year_id, budgetRequestId: row.budget_request_id ?? "", title: row.title_th,
      projectType: row.project_type, ownerName: row.owner_name, coordinatorName: row.coordinator_name,
      approvedBudget: Number(row.approved_budget), disbursementTarget: Number(row.disbursement_target),
      startsOn: row.starts_on ?? "", endsOn: row.ends_on ?? "", status: row.status,
      pendingApproval: (pendingApproval.count ?? 0) > 0,
    } : null,
  });
}

async function getAccessibleProjects(): Promise<{ data: ProjectOption[]; error: { message: string } | null }> {
  const supabase = await createClient();
  const query = await supabase.from("projects")
    .select("id,code,title_th,organization_id,fiscal_year_id,approved_budget,disbursed_amount")
    .in("status", ["proposed", "active", "on_hold", "completed"])
    .is("archived_at", null)
    .order("code");
  return {
    data: (query.data ?? []).map((row) => ({
      id: row.id, label: `${row.code} · ${row.title_th}`, organizationId: row.organization_id,
      fiscalYearId: row.fiscal_year_id, approvedBudget: Number(row.approved_budget), disbursedAmount: Number(row.disbursed_amount),
    })),
    error: query.error,
  };
}

export async function getQuarterlyReportFormOptions(reportId?: string): Promise<DataResult<QuarterlyReportFormOptions | null>> {
  const [supabase, projects, common] = await Promise.all([createClient(), getAccessibleProjects(), getOrganizationsAndYears()]);
  const recordResult = reportId
    ? await supabase.from("quarterly_reports").select("id,version,project_id,fiscal_year_id,quarter,due_at,cumulative_progress,achievement_summary,problems,status").eq("id", reportId).maybeSingle()
    : { data: null, error: null };
  const error = projects.error ?? common.error ?? recordResult.error;
  if (error) return result(null, error);
  const row = recordResult.data;
  return result({
    projects: projects.data,
    fiscalYears: common.fiscalYears,
    record: row ? {
      id: row.id, version: row.version, projectId: row.project_id, fiscalYearId: row.fiscal_year_id,
      quarter: row.quarter, dueAt: row.due_at.slice(0, 10), progress: Number(row.cumulative_progress),
      summary: row.achievement_summary ?? "", problems: row.problems ?? "", status: row.status,
    } : null,
  });
}

export async function getDisbursementFormOptions(): Promise<DataResult<DisbursementFormOptions>> {
  const [projects, common] = await Promise.all([getAccessibleProjects(), getOrganizationsAndYears()]);
  return result({ projects: projects.data, fiscalYears: common.fiscalYears }, projects.error ?? common.error);
}

export async function getKpiResultFormRecord(resultId: string): Promise<DataResult<KpiResultFormRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("kpi_results")
    .select("id,version,actual,quarter,explanation,status,evidence_count,kpi_definitions!inner(code,name,framework,framework_version,calculation_method,unit,target,direction)")
    .eq("id", resultId).maybeSingle();
  if (error || !data) return result(null, error ?? { message: "ไม่พบผลตัวชี้วัดหรือคุณไม่มีสิทธิ์เข้าถึง" });
  const definition = Array.isArray(data.kpi_definitions) ? data.kpi_definitions[0] : data.kpi_definitions;
  if (!definition || !isKpiFramework(definition.framework) || !isKpiDirection(definition.direction)) {
    return result(null, { message: "ข้อมูลชนิดของ KPI ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ" });
  }
  return result({
    id: data.id, version: data.version, code: definition.code, name: definition.name,
    framework: definition.framework, frameworkVersion: definition.framework_version,
    calculationMethod: definition.calculation_method, unit: definition.unit, target: Number(definition.target),
    direction: definition.direction, actual: data.actual === null ? null : Number(data.actual), quarter: data.quarter,
    explanation: data.explanation ?? "", status: data.status, evidenceCount: Number(data.evidence_count),
  });
}

export async function getEvidenceWorkspace(): Promise<DataResult<{ rows: EvidenceRow[]; entities: EvidenceEntityOption[] }>> {
  const supabase = await createClient();
  const [evidence, budgets, projects, reports, kpis] = await Promise.all([
    supabase.from("evidence_register").select("*").order("uploaded_at", { ascending: false }).limit(200),
    supabase.from("budget_requests").select("id,code,title_th,organization_id").is("archived_at", null).order("code"),
    supabase.from("projects").select("id,code,title_th,organization_id").is("archived_at", null).order("code"),
    supabase.from("quarterly_reports").select("id,quarter,organization_id,projects!inner(code,title_th)").order("due_at", { ascending: false }),
    supabase.from("kpi_results").select("id,organization_id,kpi_definitions!inner(code,name)").order("updated_at", { ascending: false }),
  ]);
  const error = evidence.error ?? budgets.error ?? projects.error ?? reports.error ?? kpis.error;
  const entities: EvidenceEntityOption[] = [];
  (budgets.data ?? []).forEach((row) => entities.push({ id: row.id, entityType: "budget_request", organizationId: row.organization_id, label: `คำของบ ${row.code} · ${row.title_th}` }));
  (projects.data ?? []).forEach((row) => entities.push({ id: row.id, entityType: "project", organizationId: row.organization_id, label: `โครงการ ${row.code} · ${row.title_th}` }));
  (reports.data ?? []).forEach((row) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    if (!project) return;
    entities.push({ id: row.id, entityType: "quarterly_report", organizationId: row.organization_id, label: `รายงาน Q${row.quarter} · ${project.code} ${project.title_th}` });
  });
  (kpis.data ?? []).forEach((row) => {
    const definition = Array.isArray(row.kpi_definitions) ? row.kpi_definitions[0] : row.kpi_definitions;
    if (!definition) return;
    entities.push({ id: row.id, entityType: "kpi_result", organizationId: row.organization_id, label: `KPI ${definition.code} · ${definition.name}` });
  });
  return result({
    rows: (evidence.data ?? [])
      .filter((row) => hasValues(row, ["id", "business_id", "title", "unit", "entity_type", "file_name", "storage_path", "mime_type", "is_verified"]))
      .filter((row): row is typeof row & { entity_type: EvidenceRow["entityType"] } => isEvidenceEntityType(row.entity_type))
      .map((row) => ({
      id: row.id, businessId: row.business_id, title: row.title, unit: row.unit, entityType: row.entity_type,
      fileName: row.file_name, storagePath: row.storage_path, mimeType: row.mime_type,
      sizeBytes: Number(row.size_bytes), verified: row.is_verified, uploadedAt: formatDate(row.uploaded_at),
      })),
    entities,
  }, error);
}

export async function getWorkflowInbox(): Promise<DataResult<WorkflowTask[]>> {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const { data, error } = await supabase.from("workflow_inbox").select("*").order("created_at", { ascending: false }).limit(200);
  const tasks = (data ?? []).flatMap((row): WorkflowTask[] => {
    if (!hasValues(row, ["id", "entity_type", "entity_id", "business_id", "title", "unit", "required_role", "status", "created_at"])) return [];
    if (!isEvidenceEntityType(row.entity_type) || !isAppRole(row.required_role) || !isWorkflowStatus(row.status)) return [];
    return [{
      id: row.id, entityType: row.entity_type, entityId: row.entity_id, businessId: row.business_id,
      title: row.title, unit: row.unit, requiredRole: row.required_role, status: row.status,
      dueAt: formatDate(row.due_at), createdAt: formatDate(row.created_at),
      canAct: row.status === "pending" && (viewer.roles.includes("admin") || (viewer.roles.includes(row.required_role) && (!row.assignee_id || row.assignee_id === viewer.id))),
      overdue: row.status === "pending" && row.due_at !== null && new Date(row.due_at).getTime() < Date.now(),
    }];
  });
  return result(tasks, error);
}

export async function getNotifications(): Promise<DataResult<NotificationRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notifications").select("id,entity_type,entity_id,title,body,read_at,created_at").order("created_at", { ascending: false }).limit(100);
  return result((data ?? []).map((row) => ({
    id: row.id, entityType: row.entity_type, entityId: row.entity_id, title: row.title, body: row.body,
    createdAt: formatDate(row.created_at), read: row.read_at !== null,
  })), error);
}

export async function getAdminOrganizations(): Promise<DataResult<OrganizationOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").select("id,code,name_th").eq("is_active", true).order("name_th");
  return result((data ?? []).map((row) => ({ id: row.id, code: row.code, label: row.name_th })), error);
}
