import "server-only";

import { DISBURSEMENT_STATUS_LABELS } from "@/features/disbursements/types";
import type {
  DisbursementFormOptions,
  DisbursementRow,
} from "@/features/disbursements/types";
import { getAccessibleProjects } from "@/features/projects/queries";
import { hasValues, result } from "@/features/shared/query-utils";
import { getOrganizationsAndYears } from "@/features/shared/queries";
import type { DataResult } from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";

export async function getDisbursements(): Promise<DataResult<DisbursementRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("disbursement_register")
    .select("*")
    .order("id", { ascending: true });
  return result(
    (data ?? [])
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
    error,
  );
}

export async function getDisbursementFormOptions(): Promise<DataResult<DisbursementFormOptions>> {
  const [projects, common] = await Promise.all([getAccessibleProjects(), getOrganizationsAndYears()]);
  return result(
    { projects: projects.data, fiscalYears: common.fiscalYears },
    projects.error ?? common.error,
  );
}
