import "server-only";

import type { FiscalYearMasterData } from "@/features/shared/master-data";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";

export async function getFiscalYearMasterDataCatalogs(
  fiscalYearIds: readonly string[],
): Promise<DataResult<FiscalYearMasterData[]>> {
  const uniqueFiscalYearIds = [...new Set(fiscalYearIds.filter(Boolean))];
  if (uniqueFiscalYearIds.length === 0) return result([]);

  const supabase = await createClient();
  const [planResult, expenseResult] = await Promise.all([
    supabase
      .from("plan_structure_master_data")
      .select("fiscal_year_id,level,code,name_th,parent_code")
      .in("fiscal_year_id", uniqueFiscalYearIds)
      .eq("is_active", true)
      .order("sort_order")
      .order("code"),
    supabase
      .from("budget_expense_master_data")
      .select("fiscal_year_id,expenditure_budget,expense_category,expense_subcategory")
      .in("fiscal_year_id", uniqueFiscalYearIds)
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  const error = planResult.error ?? expenseResult.error;
  if (error) return result([], error, "master_data.catalogs");

  return result(
    uniqueFiscalYearIds.map((fiscalYearId) => ({
      fiscalYearId,
      planStructures: (planResult.data ?? [])
        .filter((row) => row.fiscal_year_id === fiscalYearId)
        .map((row) => ({
          code: row.code,
          level: row.level,
          name: row.name_th,
          parentCode: row.parent_code,
        })),
      expenseOptions: (expenseResult.data ?? [])
        .filter((row) => row.fiscal_year_id === fiscalYearId)
        .map((row) => ({
          expenditureBudget: row.expenditure_budget,
          expenseCategory: row.expense_category,
          expenseSubcategory: row.expense_subcategory,
        })),
    })),
  );
}
