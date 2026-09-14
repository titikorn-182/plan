import "server-only";

import type { AdminReferenceData } from "@/features/admin/types";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { createClient } from "@/lib/supabase/server";

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
