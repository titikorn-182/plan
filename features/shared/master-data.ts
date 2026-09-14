import type { Enums } from "@/types/database.generated";

export type PlanStructureLevel = Enums<"plan_structure_level">;
export const PLAN_STRUCTURE_LEVELS = [
  "output",
  "operational_plan",
  "activity",
] as const satisfies readonly PlanStructureLevel[];

export type PlanStructureOption = Readonly<{
  code: string;
  level: PlanStructureLevel;
  name: string;
  parentCode: string | null;
}>;

export type BudgetExpenseOption = Readonly<{
  expenditureBudget: string;
  expenseCategory: string;
  expenseSubcategory: string;
}>;

export type FiscalYearMasterData = Readonly<{
  expenseOptions: readonly BudgetExpenseOption[];
  fiscalYearId: string;
  planStructures: readonly PlanStructureOption[];
}>;

export const EMPTY_FISCAL_YEAR_MASTER_DATA: FiscalYearMasterData = {
  expenseOptions: [],
  fiscalYearId: "",
  planStructures: [],
};

export function getFiscalYearMasterData(
  catalogs: readonly FiscalYearMasterData[],
  fiscalYearId: string,
): FiscalYearMasterData {
  return (
    catalogs.find((catalog) => catalog.fiscalYearId === fiscalYearId) ??
    EMPTY_FISCAL_YEAR_MASTER_DATA
  );
}

export function getPlanStructureOptions(
  catalog: FiscalYearMasterData,
  level: PlanStructureLevel,
): readonly PlanStructureOption[] {
  return catalog.planStructures.filter((option) => option.level === level);
}

export function getExpenditureBudgetOptions(options: readonly BudgetExpenseOption[]): string[] {
  return [...new Set(options.map((option) => option.expenditureBudget))];
}

export function getExpenseCategoryOptions(
  options: readonly BudgetExpenseOption[],
  expenditureBudget: string,
): string[] {
  return [
    ...new Set(
      options
        .filter((option) => option.expenditureBudget === expenditureBudget)
        .map((option) => option.expenseCategory),
    ),
  ];
}

export function getExpenseSubcategoryOptions(
  options: readonly BudgetExpenseOption[],
  expenditureBudget: string,
  expenseCategory: string,
): string[] {
  return [
    ...new Set(
      options
        .filter(
          (option) =>
            option.expenditureBudget === expenditureBudget &&
            option.expenseCategory === expenseCategory,
        )
        .map((option) => option.expenseSubcategory),
    ),
  ];
}

export function isBudgetExpenseOption(
  options: readonly BudgetExpenseOption[],
  value: BudgetExpenseOption,
): boolean {
  return options.some(
    (option) =>
      option.expenditureBudget === value.expenditureBudget &&
      option.expenseCategory === value.expenseCategory &&
      option.expenseSubcategory === value.expenseSubcategory,
  );
}
