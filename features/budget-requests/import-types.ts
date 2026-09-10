import type { BudgetRequestSourceValues } from "@/features/budget-requests/source-fields";

export type BudgetRequestImportedRecord = {
  errors: string[];
  rowNumber: number;
  values: BudgetRequestSourceValues;
  warnings: string[];
};

export type BudgetRequestImportResult = {
  errors: string[];
  records: BudgetRequestImportedRecord[];
};
