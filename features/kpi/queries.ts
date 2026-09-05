import "server-only";

import {
  isKpiDirection,
  isKpiFramework,
  isKpiResultStatus,
  KPI_STATUS_LABELS,
  type KpiResultFormRecord,
  type KpiRow,
} from "@/features/kpi/types";
import { expectedResultError, hasValues, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import type { DataResult } from "@/features/shared/types";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getKpis(page = 1): Promise<DataResult<PaginatedData<KpiRow>>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("kpi_register")
    .select("*", { count: "exact" })
    .order("code", { ascending: true })
    .range(from, to);
  return result(
    {
      items: (data ?? [])
        .filter((row) =>
          hasValues(row, ["id", "code", "name", "owner", "framework", "unit", "status"]),
        )
        .map((row) => ({
          uuid: row.id,
          code: row.code,
          name: row.name,
          owner: row.owner,
          framework: isKpiFramework(row.framework) ? row.framework : "Internal",
          target: Number(row.target),
          actual: row.actual === null ? null : Number(row.actual),
          unit: row.unit,
          status: KPI_STATUS_LABELS[row.status] ?? "ไม่มีข้อมูล",
          workflowStatus: isKpiResultStatus(row.workflow_status)
            ? row.workflow_status
            : "not_started",
        })),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "kpi.list",
  );
}

export async function getKpiResultFormRecord(
  resultId: string,
): Promise<DataResult<KpiResultFormRecord | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kpi_results")
    .select(
      "id,version,actual,quarter,explanation,status,evidence_count,kpi_definitions!inner(code,name,framework,framework_version,calculation_method,unit,target,direction)",
    )
    .eq("id", resultId)
    .maybeSingle();
  if (error) return result(null, error, "kpi.form");
  if (!data) return expectedResultError(null, "ไม่พบผลตัวชี้วัดหรือคุณไม่มีสิทธิ์เข้าถึง");

  const definition = Array.isArray(data.kpi_definitions)
    ? data.kpi_definitions[0]
    : data.kpi_definitions;
  if (
    !definition ||
    !isKpiFramework(definition.framework) ||
    !isKpiDirection(definition.direction)
  ) {
    return expectedResultError(null, "ข้อมูลชนิดของ KPI ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ");
  }
  return result({
    id: data.id,
    version: data.version,
    code: definition.code,
    name: definition.name,
    framework: definition.framework,
    frameworkVersion: definition.framework_version,
    calculationMethod: definition.calculation_method,
    unit: definition.unit,
    target: Number(definition.target),
    direction: definition.direction,
    actual: data.actual === null ? null : Number(data.actual),
    quarter: data.quarter,
    explanation: data.explanation ?? "",
    status: data.status,
    evidenceCount: Number(data.evidence_count),
  });
}
