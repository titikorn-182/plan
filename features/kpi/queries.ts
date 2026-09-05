import "server-only";

import {
  isKpiDirection,
  isKpiFramework,
  isKpiResultStatus,
  KPI_STATUS_LABELS,
  type KpiResultFormRecord,
  type KpiRow,
} from "@/features/kpi/types";
import { hasValues, result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";

export async function getKpis(): Promise<DataResult<KpiRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kpi_register")
    .select("*")
    .order("code", { ascending: true });
  return result(
    (data ?? [])
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
    error,
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
  if (error || !data) {
    return result(null, error ?? { message: "ไม่พบผลตัวชี้วัดหรือคุณไม่มีสิทธิ์เข้าถึง" });
  }

  const definition = Array.isArray(data.kpi_definitions)
    ? data.kpi_definitions[0]
    : data.kpi_definitions;
  if (
    !definition ||
    !isKpiFramework(definition.framework) ||
    !isKpiDirection(definition.direction)
  ) {
    return result(null, { message: "ข้อมูลชนิดของ KPI ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ" });
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
