import "server-only";

import {
  isEvidenceEntityType,
  type EvidenceEntityOption,
  type EvidenceRow,
} from "@/features/evidence/types";
import { formatDate, hasValues, result } from "@/features/shared/query-utils";
import { createPagination, getPaginationRange } from "@/features/shared/pagination";
import type { DataResult } from "@/features/shared/types";
import type { PaginationMeta } from "@/features/shared/pagination";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getEvidenceWorkspace(page = 1): Promise<
  DataResult<{
    rows: EvidenceRow[];
    entities: EvidenceEntityOption[];
    pagination: PaginationMeta;
  }>
> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.evidencePageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const [evidence, budgets, projects, reports, kpis] = await Promise.all([
    supabase
      .from("evidence_register")
      .select("*", { count: "exact" })
      .order("uploaded_at", { ascending: false })
      .range(from, to),
    supabase
      .from("budget_requests")
      .select("id,code,title_th,organization_id")
      .is("archived_at", null)
      .order("code")
      .limit(QUERY_LIMITS.selectOptions),
    supabase
      .from("projects")
      .select("id,code,title_th,organization_id")
      .is("archived_at", null)
      .order("code")
      .limit(QUERY_LIMITS.selectOptions),
    supabase
      .from("quarterly_reports")
      .select("id,quarter,organization_id,projects!inner(code,title_th)")
      .order("due_at", { ascending: false })
      .limit(QUERY_LIMITS.selectOptions),
    supabase
      .from("kpi_results")
      .select("id,organization_id,kpi_definitions!inner(code,name)")
      .order("updated_at", { ascending: false })
      .limit(QUERY_LIMITS.selectOptions),
  ]);
  const error = evidence.error ?? budgets.error ?? projects.error ?? reports.error ?? kpis.error;
  const entities: EvidenceEntityOption[] = [];

  (budgets.data ?? []).forEach((row) =>
    entities.push({
      id: row.id,
      entityType: "budget_request",
      organizationId: row.organization_id,
      label: `คำของบ ${row.code} · ${row.title_th}`,
    }),
  );
  (projects.data ?? []).forEach((row) =>
    entities.push({
      id: row.id,
      entityType: "project",
      organizationId: row.organization_id,
      label: `โครงการ ${row.code} · ${row.title_th}`,
    }),
  );
  (reports.data ?? []).forEach((row) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    if (!project) return;
    entities.push({
      id: row.id,
      entityType: "quarterly_report",
      organizationId: row.organization_id,
      label: `รายงาน Q${row.quarter} · ${project.code} ${project.title_th}`,
    });
  });
  (kpis.data ?? []).forEach((row) => {
    const definition = Array.isArray(row.kpi_definitions)
      ? row.kpi_definitions[0]
      : row.kpi_definitions;
    if (!definition) return;
    entities.push({
      id: row.id,
      entityType: "kpi_result",
      organizationId: row.organization_id,
      label: `KPI ${definition.code} · ${definition.name}`,
    });
  });

  return result(
    {
      rows: (evidence.data ?? [])
        .filter((row) =>
          hasValues(row, [
            "id",
            "business_id",
            "title",
            "unit",
            "entity_type",
            "file_name",
            "storage_path",
            "mime_type",
            "is_verified",
          ]),
        )
        .filter((row): row is typeof row & { entity_type: EvidenceRow["entityType"] } =>
          isEvidenceEntityType(row.entity_type),
        )
        .map((row) => ({
          id: row.id,
          businessId: row.business_id,
          title: row.title,
          unit: row.unit,
          entityType: row.entity_type,
          fileName: row.file_name,
          storagePath: row.storage_path,
          mimeType: row.mime_type,
          sizeBytes: Number(row.size_bytes),
          verified: row.is_verified,
          uploadedAt: formatDate(row.uploaded_at),
        })),
      entities,
      pagination: createPagination(evidence.count, page, pageSize),
    },
    error,
    "evidence.workspace",
  );
}
