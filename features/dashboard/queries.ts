import "server-only";

import {
  type CommandCenterRow,
  DECISION_STATE_LABELS,
  type DecisionRecord,
  isDecisionStage,
  type LifecycleItem,
  SEVERITY_LABELS,
} from "@/features/dashboard/types";
import { isKpiDirection, type KpiDirection, type KpiResultState } from "@/features/kpi/types";
import { formatDate, hasValues, isRecord, result } from "@/features/shared/query-utils";
import { formatThaiInteger, formatThaiMoney } from "@/features/shared/formatters";
import { getReportingPeriod } from "@/features/shared/queries";
import type { DataResult } from "@/features/shared/types";
import {
  calculateKpiAttainmentPercent,
  COMMAND_CENTER_THRESHOLDS,
  getQuarterProgressTarget,
} from "@/lib/operations/rules";
import { createClient } from "@/lib/supabase/server";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";

interface DashboardKpi {
  id: string;
  organizationId: string;
  owner: string;
  target: number;
  actual: number | null;
  direction: KpiDirection;
  resultState: KpiResultState;
}

interface Aggregate extends CommandCenterRow {
  progressTotal: number;
  disbursedAmount: number;
  targetTotal: number;
  kpiRatioTotal: number;
}

export async function getDashboardData(): Promise<
  DataResult<{ records: DecisionRecord[]; lifecycle: LifecycleItem[]; matrix: CommandCenterRow[] }>
> {
  const [supabase, reportingPeriod] = await Promise.all([createClient(), getReportingPeriod()]);
  const progressTarget = getQuarterProgressTarget(reportingPeriod.quarter);
  const [queue, organizations, budgets, projects, disbursements, kpis, attachments] =
    await Promise.all([
      supabase
        .from("decision_queue")
        .select("*")
        .eq("buddhist_year", reportingPeriod.buddhistYear)
        .not("entity_id", "in", RETIRED_DEMO_FILTERS.entities)
        .order("sort_key", { ascending: false })
        .limit(QUERY_LIMITS.dashboardDecisionQueue),
      supabase
        .from("organizations")
        .select("id,code,name_th")
        .eq("is_active", true)
        .not("id", "in", RETIRED_DEMO_FILTERS.organizations)
        .order("name_th"),
      supabase
        .from("budget_request_register")
        .select("organization_id,unit,amount")
        .eq("buddhist_year", reportingPeriod.buddhistYear)
        .not("id", "in", RETIRED_DEMO_FILTERS.budgetRequests),
      supabase
        .from("project_register")
        .select("organization_id,unit,budget,progress")
        .eq(
          "fiscal_year_id",
          reportingPeriod.fiscalYearId ?? "00000000-0000-0000-0000-000000000000",
        )
        .not("id", "in", RETIRED_DEMO_FILTERS.projects),
      supabase
        .from("disbursement_register")
        .select("organization_id,unit,approved,q1,q2,q3,q4,target")
        .eq(
          "fiscal_year_id",
          reportingPeriod.fiscalYearId ?? "00000000-0000-0000-0000-000000000000",
        )
        .not("project_id", "in", RETIRED_DEMO_FILTERS.projects),
      supabase
        .from("kpi_results")
        .select(
          "id,organization_id,actual,result_state,evidence_count,kpi_definitions!inner(owner_name,target,direction)",
        )
        .eq(
          "fiscal_year_id",
          reportingPeriod.fiscalYearId ?? "00000000-0000-0000-0000-000000000000",
        )
        .not("id", "in", RETIRED_DEMO_FILTERS.kpiResults)
        .or(`quarter.is.null,quarter.eq.${reportingPeriod.quarter}`),
      supabase
        .from("attachments")
        .select("organization_id,is_verified")
        .is("archived_at", null)
        .not("id", "in", RETIRED_DEMO_FILTERS.attachments),
    ]);
  const dashboardError =
    queue.error ??
    organizations.error ??
    budgets.error ??
    projects.error ??
    disbursements.error ??
    kpis.error ??
    attachments.error;
  if (dashboardError) {
    return result({ records: [], lifecycle: [], matrix: [] }, dashboardError);
  }

  const dashboardKpis = (kpis.data ?? []).flatMap((row): DashboardKpi[] => {
    const definition = Array.isArray(row.kpi_definitions)
      ? row.kpi_definitions[0]
      : row.kpi_definitions;
    if (!definition || !isKpiDirection(definition.direction)) return [];
    return [
      {
        id: row.id,
        organizationId: row.organization_id,
        owner: definition.owner_name,
        target: Number(definition.target),
        actual: row.actual === null ? null : Number(row.actual),
        direction: definition.direction,
        resultState: row.result_state,
      },
    ];
  });
  const dashboardKpiById = new Map(dashboardKpis.map((item) => [item.id, item]));

  const records: DecisionRecord[] = (queue.data ?? [])
    .filter((row) =>
      hasValues(row, [
        "entity_id",
        "business_id",
        "title",
        "unit",
        "stage",
        "raw_state",
        "severity",
        "owner",
        "coordinator",
        "buddhist_year",
        "project_type",
        "progress",
      ]),
    )
    .filter((row): row is typeof row & { stage: DecisionRecord["stage"] } =>
      isDecisionStage(row.stage),
    )
    .map((row) => {
      const evidence = Array.isArray(row.evidence) ? row.evidence : [];
      const stateKey =
        row.raw_state === "submitted" && row.entity_type === "kpi_result"
          ? "submitted_kpi"
          : row.raw_state;
      const kpi = row.stage === "KPI" ? dashboardKpiById.get(row.entity_id) : undefined;
      const kpiProgress = kpi
        ? calculateKpiAttainmentPercent(kpi.actual, kpi.target, kpi.direction)
        : null;
      return {
        uuid: row.entity_id,
        id: row.business_id,
        title: row.title,
        unit: row.unit,
        stage: row.stage,
        state: DECISION_STATE_LABELS[stateKey] ?? "รอพิจารณา",
        amount:
          row.amount_value === null
            ? (row.amount_note ?? "—")
            : formatThaiMoney(Number(row.amount_value)),
        severity: SEVERITY_LABELS[row.severity] ?? "ปานกลาง",
        owner: row.owner,
        coordinator: row.coordinator,
        fiscalYear: String(row.buddhist_year),
        projectType: row.project_type,
        progress: kpiProgress ?? Number(row.progress),
        evidence: evidence.flatMap((item) =>
          isRecord(item)
            ? [
                {
                  name: typeof item.name === "string" ? item.name : "เอกสารแนบ",
                  date: typeof item.date === "string" ? formatDate(item.date) : "—",
                  verified: item.verified === true,
                },
              ]
            : [],
        ),
      };
    });

  const counts = records.reduce<Record<DecisionRecord["stage"], number>>(
    (accumulator, row) => {
      accumulator[row.stage] += 1;
      return accumulator;
    },
    { คำของบ: 0, โครงการ: 0, ดำเนินงาน: 0, เบิกจ่าย: 0, KPI: 0 },
  );
  const lifecycle: LifecycleItem[] = (
    ["คำของบ", "โครงการ", "ดำเนินงาน", "เบิกจ่าย", "KPI"] as const
  ).map((label) => ({
    label,
    count: formatThaiInteger(counts[label]),
    helper:
      label === "KPI"
        ? "ตัวชี้วัด"
        : label === "โครงการ" || label === "ดำเนินงาน"
          ? "โครงการ"
          : "รายการ",
  }));

  const byOrganization = new Map<string, Aggregate>();
  const ensure = (id: string, unit: string, code = "ORG") => {
    const current = byOrganization.get(id);
    if (current) return current;
    const created: Aggregate = {
      id,
      code,
      unit,
      requested: 0,
      approved: 0,
      progress: 0,
      disbursement: 0,
      disbursementTarget: 0,
      kpiScore: null,
      kpiMet: 0,
      kpiTotal: 0,
      evidenceVerified: 0,
      evidenceTotal: 0,
      projectCount: 0,
      status: "noData",
      progressTotal: 0,
      disbursedAmount: 0,
      targetTotal: 0,
      kpiRatioTotal: 0,
    };
    byOrganization.set(id, created);
    return created;
  };

  (organizations.data ?? []).forEach((row) => ensure(row.id, row.name_th, row.code));
  (budgets.data ?? [])
    .filter((row) => hasValues(row, ["organization_id", "unit"]))
    .forEach((row) => {
      ensure(row.organization_id, row.unit).requested += Number(row.amount);
    });
  (projects.data ?? [])
    .filter((row) => hasValues(row, ["organization_id", "unit"]))
    .forEach((row) => {
      const aggregate = ensure(row.organization_id, row.unit);
      aggregate.approved += Number(row.budget);
      aggregate.progressTotal += Number(row.progress);
      aggregate.projectCount += 1;
    });
  (disbursements.data ?? [])
    .filter((row) => hasValues(row, ["organization_id", "unit"]))
    .forEach((row) => {
      const aggregate = ensure(row.organization_id, row.unit);
      aggregate.disbursedAmount +=
        Number(row.q1) + Number(row.q2) + Number(row.q3) + Number(row.q4);
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
    .filter(
      (row) => row.requested > 0 || row.approved > 0 || row.kpiTotal > 0 || row.evidenceTotal > 0,
    )
    .map<CommandCenterRow>((row) => {
      const progress = row.projectCount > 0 ? row.progressTotal / row.projectCount : 0;
      const disbursement = row.approved > 0 ? (row.disbursedAmount / row.approved) * 100 : 0;
      const disbursementTarget = row.projectCount > 0 ? row.targetTotal / row.projectCount : 0;
      const kpiScore = row.kpiTotal > 0 ? row.kpiRatioTotal / row.kpiTotal : null;
      const hasDeliveryData = row.projectCount > 0;
      const status: CommandCenterRow["status"] =
        !hasDeliveryData && kpiScore === null
          ? "noData"
          : progress < Math.max(0, progressTarget - COMMAND_CENTER_THRESHOLDS.riskGap) ||
              (hasDeliveryData &&
                disbursement <
                  Math.max(0, disbursementTarget - COMMAND_CENTER_THRESHOLDS.riskGap)) ||
              (kpiScore !== null && kpiScore < COMMAND_CENTER_THRESHOLDS.kpiRisk)
            ? "risk"
            : progress >= progressTarget + COMMAND_CENTER_THRESHOLDS.aheadGap &&
                disbursement >= disbursementTarget &&
                (kpiScore === null || kpiScore >= COMMAND_CENTER_THRESHOLDS.kpiAhead)
              ? "ahead"
              : progress >= progressTarget &&
                  disbursement >=
                    Math.max(0, disbursementTarget - COMMAND_CENTER_THRESHOLDS.watchGap) &&
                  (kpiScore === null || kpiScore >= COMMAND_CENTER_THRESHOLDS.kpiOnTrack)
                ? "onTrack"
                : "watch";
      return {
        id: row.id,
        code: row.code,
        unit: row.unit,
        requested: row.requested,
        approved: row.approved,
        progress,
        disbursement,
        disbursementTarget,
        kpiScore,
        kpiMet: row.kpiMet,
        kpiTotal: row.kpiTotal,
        evidenceVerified: row.evidenceVerified,
        evidenceTotal: row.evidenceTotal,
        projectCount: row.projectCount,
        status,
      };
    })
    .sort(
      (first, second) =>
        second.approved - first.approved ||
        second.requested - first.requested ||
        first.unit.localeCompare(second.unit, "th"),
    );

  return result({ records, lifecycle, matrix });
}
