import type {
  BudgetRequestSourceKey,
  BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";
import type { BudgetRequestSourceOptions } from "@/features/budget-requests/source-options";
import type { FiscalYearMasterData } from "@/features/shared/master-data";
import {
  applyPlanStructureSelection,
  getPlanStructureSelectionOptions,
} from "@/features/shared/plan-structure";

const planFields = {
  outputCode: ["output", "code"],
  outputName: ["output", "name"],
  operationalPlanCode: ["operationalPlan", "code"],
  operationalPlanName: ["operationalPlan", "name"],
  activityCode: ["activity", "code"],
  projectActivityName: ["activity", "name"],
} as const;

export function applyBudgetPlanSelection(
  values: BudgetRequestSourceValues,
  key: BudgetRequestSourceKey,
  value: string,
  catalog: FiscalYearMasterData,
): BudgetRequestSourceValues | null {
  if (!(key in planFields)) return null;
  const [level, valueType] = planFields[key as keyof typeof planFields];
  return applyPlanStructureSelection(values, level, valueType, value, catalog);
}

export function getBudgetPlanSourceOptions(
  sourceOptions: BudgetRequestSourceOptions,
  values: BudgetRequestSourceValues,
  catalog: FiscalYearMasterData,
): BudgetRequestSourceOptions {
  const options = { ...sourceOptions };
  for (const key of Object.keys(planFields) as (keyof typeof planFields)[]) {
    const [level, valueType] = planFields[key];
    options[key] = [
      ...new Set(
        getPlanStructureSelectionOptions(values, level, catalog).map((item) => item[valueType]),
      ),
    ];
  }
  return options;
}
