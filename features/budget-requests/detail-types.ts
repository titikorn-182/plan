import type { BudgetFormRecord } from "@/features/budget-requests/types";

export type BudgetRequestExpenseLine = {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type BudgetRequestDetail = BudgetFormRecord & {
  organizationName: string;
  fiscalYearLabel: string;
  updatedAt: string;
  submittedAt: string;
  expenseLines: BudgetRequestExpenseLine[];
};
