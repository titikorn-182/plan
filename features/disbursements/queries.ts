import "server-only";

import { DISBURSEMENT_STATUS_LABELS } from "@/features/disbursements/types";
import type { DisbursementFormOptions, DisbursementRow } from "@/features/disbursements/types";
import { getAccessibleProjects } from "@/features/projects/queries";
import { hasValues, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import { getOrganizationsAndYears } from "@/features/shared/queries";
import type { DataResult } from "@/features/shared/types";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getDisbursements(
  page = 1,
): Promise<DataResult<PaginatedData<DisbursementRow>>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("disbursement_register")
    .select("*", { count: "exact" })
    .order("id", { ascending: true })
    .range(from, to);
  return result(
    {
      items: (data ?? [])
        .filter((row) => hasValues(row, ["project_id", "id", "project", "unit", "status"]))
        .map((row) => ({
          uuid: row.project_id,
          id: row.id,
          project: row.project,
          unit: row.unit,
          approved: Number(row.approved),
          q1: Number(row.q1),
          q2: Number(row.q2),
          q3: Number(row.q3),
          q4: Number(row.q4),
          target: Number(row.target),
          status: DISBURSEMENT_STATUS_LABELS[row.status] ?? "เฝ้าระวัง",
        })),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "disbursements.list",
  );
}

export async function getDisbursementFormOptions(): Promise<DataResult<DisbursementFormOptions>> {
  const [projects, common] = await Promise.all([
    getAccessibleProjects(),
    getOrganizationsAndYears(),
  ]);
  return result(
    { projects: projects.data, fiscalYears: common.fiscalYears },
    projects.error ?? common.error,
  );
}
